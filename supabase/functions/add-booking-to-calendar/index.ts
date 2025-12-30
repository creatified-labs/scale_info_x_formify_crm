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

    const { booking_id } = await req.json()

    if (!booking_id) {
      return new Response(
        JSON.stringify({ error: 'Missing booking_id' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

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
    if (!companyId) {
      return new Response(
        JSON.stringify({ error: 'Company not found for booking' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      )
    }

    // Get company settings
    const { data: company } = await supabaseClient
      .from('companies')
      .select('settings')
      .eq('id', companyId)
      .single()

    const settings = company?.settings as any
    const autoAdd = settings?.google_calendar?.auto_add_bookings ?? true
    const autoCreateMeet = settings?.google_calendar?.auto_create_meet_links ?? true

    if (!autoAdd) {
      return new Response(
        JSON.stringify({ message: 'Auto-add to calendar is disabled', skipped: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    // Get integration account
    const { data: integration, error: integrationError } = await supabaseClient
      .from('integration_accounts')
      .select('access_token, refresh_token')
      .eq('company_id', companyId)
      .eq('provider', 'google_calendar')
      .maybeSingle()

    if (integrationError || !integration?.access_token) {
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

    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1`,
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
      console.error('Failed to create calendar event:', error)
      return new Response(
        JSON.stringify({ error: 'Failed to create calendar event', details: error }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    const calendarEvent = await response.json()
    const meetLink = calendarEvent.conferenceData?.entryPoints?.find(
      (ep: any) => ep.entryPointType === 'video'
    )?.uri

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
