import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    const { booking_id, manual = false } = await req.json() as { booking_id: string; manual?: boolean }

    if (!booking_id) {
      return new Response(
        JSON.stringify({ error: 'Missing booking_id' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    console.log('add-booking-to-calendar called:', { booking_id, manual })

    // Get booking details
    const { data: booking, error: bookingError } = await supabaseClient
      .from('bookings')
      .select(`
        *,
        event_types (
          name,
          description,
          duration_minutes,
          user_id,
          company_id
        )
      `)
      .eq('id', booking_id)
      .single()

    if (bookingError || !booking) {
      return new Response(
        JSON.stringify({ error: 'Booking not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      )
    }

    const companyId = booking.event_types?.company_id
    console.log('Company ID from booking:', companyId)
    
    if (!companyId) {
      console.error('No company_id found on event type')
      return new Response(
        JSON.stringify({ error: 'Company not found for booking' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      )
    }

    // Get company settings
    const { data: company, error: companyError } = await supabaseClient
      .from('companies')
      .select('settings')
      .eq('id', companyId)
      .single()

    console.log('Company settings query result:', { company, error: companyError })

    const settings = company?.settings as any
    // Default to false for new companies, true only if explicitly set to true
    const autoAdd = settings?.google_calendar?.auto_add_bookings === true
    const autoCreateMeet = settings?.google_calendar?.auto_create_meet_links === true
    const targetCalendar = settings?.google_calendar?.add_events_to_calendar || 'primary'

    console.log('Calendar settings:', { autoAdd, autoCreateMeet, targetCalendar, manual, rawSettings: settings?.google_calendar })

    // Skip autoAdd check if this is a manual request (user clicked "Generate Link")
    if (!autoAdd && !manual) {
      console.log('Auto-add to calendar is disabled in settings and not a manual request')
      return new Response(
        JSON.stringify({ message: 'Auto-add to calendar is disabled', skipped: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    // Get user_id from event type
    const userId = booking.event_types?.user_id
    console.log('User ID from event type:', userId)
    
    if (!userId) {
      console.error('No user_id found on event type')
      return new Response(
        JSON.stringify({ error: 'User not found for booking' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      )
    }

    // Get integration from user_integrations table
    const { data: integration, error: integrationError } = await supabaseClient
      .from('user_integrations')
      .select('access_token, refresh_token')
      .eq('user_id', userId)
      .eq('provider', 'google')
      .maybeSingle()

    console.log('Integration query result:', { 
      hasIntegration: !!integration, 
      hasAccessToken: !!integration?.access_token,
      error: integrationError 
    })

    if (integrationError || !integration?.access_token) {
      console.error('No Google Calendar integration found or no access token')
      return new Response(
        JSON.stringify({ error: 'No Google Calendar connected' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Create calendar event
    const eventData: any = {
      summary: `${booking.event_types?.name || 'Booking'} with ${booking.invitee_name}`,
      description: booking.event_types?.description || '',
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
          requestId: `booking-${booking_id}`,
          conferenceSolutionKey: { type: 'hangoutsMeet' },
        },
      }
    }

    console.log('Creating calendar event with data:', JSON.stringify(eventData, null, 2))
    console.log('Target calendar:', targetCalendar)

    // Don't send Google Calendar email notifications - we handle our own email notifications
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(targetCalendar)}/events?conferenceDataVersion=1&sendUpdates=none`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${integration.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(eventData),
      }
    )

    console.log('Google Calendar API response status:', response.status)

    if (!response.ok) {
      const error = await response.text()
      console.error('Failed to create calendar event:', { status: response.status, error })
      return new Response(
        JSON.stringify({ error: 'Failed to create calendar event', details: error, status: response.status }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    const calendarEvent = await response.json() as {
      id: string
      htmlLink: string
      conferenceData?: {
        entryPoints?: Array<{ entryPointType: string; uri: string }>
      }
    }
    
    console.log('Calendar event created:', { 
      id: calendarEvent.id, 
      htmlLink: calendarEvent.htmlLink,
      hasConferenceData: !!calendarEvent.conferenceData,
      entryPoints: calendarEvent.conferenceData?.entryPoints
    })
    
    const meetLink = calendarEvent.conferenceData?.entryPoints?.find(
      (ep: any) => ep.entryPointType === 'video'
    )?.uri
    
    console.log('Meet link extracted:', meetLink)

    // Update booking with calendar event ID and meet link
    const { error: updateError } = await supabaseClient
      .from('bookings')
      .update({
        calendar_event_id: calendarEvent.id,
        meet_link: meetLink || null,
        calendar_synced_at: new Date().toISOString(),
      })
      .eq('id', booking_id)

    if (updateError) {
      console.error('Failed to update booking:', updateError)
    }

    return new Response(
      JSON.stringify({
        success: true,
        calendar_event_id: calendarEvent.id,
        meet_link: meetLink,
        html_link: calendarEvent.htmlLink,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
