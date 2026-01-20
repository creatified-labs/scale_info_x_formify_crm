import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface BackfillRequest {
  booking_ids?: string[]
  process_all_pending?: boolean
  skip_past_bookings?: boolean
}

interface BookingResult {
  booking_id: string
  status: 'success' | 'failed' | 'skipped'
  meet_link?: string
  error?: string
  reason?: string
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    const {
      booking_ids,
      process_all_pending = false,
      skip_past_bookings = true,
    } = await req.json() as BackfillRequest

    console.log('Backfill request:', { booking_ids, process_all_pending, skip_past_bookings })

    // Get user ID from auth header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      )
    }

    // Verify user has Google Calendar connected
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    )

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      )
    }

    // Check for Google integration
    const { data: integration, error: integrationError } = await supabaseClient
      .from('user_integrations')
      .select('access_token, refresh_token, expires_at')
      .eq('user_id', user.id)
      .eq('provider', 'google')
      .maybeSingle()

    if (integrationError || !integration?.access_token) {
      return new Response(
        JSON.stringify({ error: 'No Google Calendar connected. Please connect your Google Calendar first.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Build query for bookings that need links
    let query = supabaseClient
      .from('bookings')
      .select(`
        id,
        start_time,
        end_time,
        invitee_name,
        invitee_email,
        invitee_timezone,
        chosen_call_type,
        status,
        video_join_url,
        calendar_event_id,
        event_types (
          name,
          description,
          duration_minutes,
          user_id,
          company_id
        )
      `)
      .eq('event_types.user_id', user.id)
      .eq('status', 'scheduled')
      .in('chosen_call_type', ['zoom', 'google_meet', 'custom'])
      .is('calendar_event_id', null)

    // Add specific booking IDs filter if provided
    if (booking_ids && booking_ids.length > 0) {
      query = query.in('id', booking_ids)
    }

    // Add past bookings filter if requested
    if (skip_past_bookings) {
      query = query.gte('start_time', new Date().toISOString())
    }

    const { data: bookings, error: bookingsError } = await query

    if (bookingsError) {
      console.error('Error fetching bookings:', bookingsError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch bookings' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    // Filter out bookings that already have a meeting link
    const placeholder = 'Meeting link will be sent by host'
    const bookingsNeedingLinks = bookings.filter(booking =>
      !booking.video_join_url || booking.video_join_url === placeholder
    )

    console.log(`Found ${bookingsNeedingLinks.length} bookings needing links out of ${bookings.length} total`)

    if (bookingsNeedingLinks.length === 0) {
      return new Response(
        JSON.stringify({
          processed: 0,
          successful: 0,
          failed: 0,
          skipped: 0,
          results: [],
          message: 'No bookings need meeting links'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    // Process each booking
    const results: BookingResult[] = []
    let successful = 0
    let failed = 0
    let skipped = 0

    for (const booking of bookingsNeedingLinks) {
      try {
        console.log(`Processing booking ${booking.id}`)

        // Skip if booking doesn't have necessary data
        if (!booking.event_types) {
          results.push({
            booking_id: booking.id,
            status: 'skipped',
            reason: 'Missing event type data'
          })
          skipped++
          continue
        }

        const companyId = booking.event_types.company_id

        // Get company settings
        const { data: company } = await supabaseClient
          .from('companies')
          .select('settings')
          .eq('id', companyId)
          .single()

        const settings = company?.settings as any
        const autoCreateMeet = settings?.google_calendar?.auto_create_meet_links ?? true
        const targetCalendar = settings?.google_calendar?.add_events_to_calendar || 'primary'

        // Create calendar event
        const eventData: any = {
          summary: `${booking.event_types.name || 'Booking'} with ${booking.invitee_name}`,
          description: booking.event_types.description || '',
          start: {
            dateTime: booking.start_time,
            timeZone: booking.invitee_timezone,
          },
          end: {
            dateTime: booking.end_time,
            timeZone: booking.invitee_timezone,
          },
          attendees: [
            { email: booking.invitee_email, displayName: booking.invitee_name },
          ],
        }

        // Add Google Meet conference if enabled
        if (autoCreateMeet) {
          eventData.conferenceData = {
            createRequest: {
              requestId: `booking-${booking.id}-${Date.now()}`,
              conferenceSolutionKey: { type: 'hangoutsMeet' },
            },
          }
        }

        const response = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(targetCalendar)}/events?conferenceDataVersion=1`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${integration.access_token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(eventData),
          }
        )

        if (!response.ok) {
          const error = await response.text()
          console.error(`Failed to create calendar event for booking ${booking.id}:`, error)

          results.push({
            booking_id: booking.id,
            status: 'failed',
            error: `Google Calendar API error: ${response.status}`
          })
          failed++

          // Add delay before next request
          await new Promise(resolve => setTimeout(resolve, 200))
          continue
        }

        const calendarEvent = await response.json() as {
          id: string
          htmlLink: string
          conferenceData?: {
            entryPoints?: Array<{ entryPointType: string; uri: string }>
          }
        }

        const meetLink = calendarEvent.conferenceData?.entryPoints?.find(
          (ep: any) => ep.entryPointType === 'video'
        )?.uri

        // Update booking with calendar event ID and meet link
        const { error: updateError } = await supabaseClient
          .from('bookings')
          .update({
            calendar_event_id: calendarEvent.id,
            video_join_url: meetLink || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', booking.id)

        if (updateError) {
          console.error(`Failed to update booking ${booking.id}:`, updateError)
          results.push({
            booking_id: booking.id,
            status: 'failed',
            error: 'Failed to update booking in database'
          })
          failed++
        } else {
          results.push({
            booking_id: booking.id,
            status: 'success',
            meet_link: meetLink
          })
          successful++
          console.log(`Successfully processed booking ${booking.id}`)
        }

        // Add delay between requests to avoid rate limits (5 req/sec)
        await new Promise(resolve => setTimeout(resolve, 200))

      } catch (error) {
        console.error(`Error processing booking ${booking.id}:`, error)
        results.push({
          booking_id: booking.id,
          status: 'failed',
          error: error.message || 'Unknown error'
        })
        failed++

        // Add delay before next request even on error
        await new Promise(resolve => setTimeout(resolve, 200))
      }
    }

    console.log('Backfill complete:', { successful, failed, skipped })

    return new Response(
      JSON.stringify({
        processed: bookingsNeedingLinks.length,
        successful,
        failed,
        skipped,
        results,
        message: `Processed ${successful} booking${successful === 1 ? '' : 's'} successfully`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error) {
    console.error('Error in backfill function:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
