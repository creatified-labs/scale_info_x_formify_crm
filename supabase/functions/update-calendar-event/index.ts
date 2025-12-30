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

    const { booking_id, action } = await req.json()

    if (!booking_id || !action) {
      return new Response(
        JSON.stringify({ error: 'Missing booking_id or action' }),
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

    if (!booking.calendar_event_id) {
      return new Response(
        JSON.stringify({ message: 'No calendar event to update', skipped: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    const companyId = booking.event_types?.company_id
    if (!companyId) {
      return new Response(
        JSON.stringify({ error: 'Company not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      )
    }

    // Get integration account
    const { data: integration } = await supabaseClient
      .from('integration_accounts')
      .select('access_token')
      .eq('company_id', companyId)
      .eq('provider', 'google_calendar')
      .maybeSingle()

    if (!integration?.access_token) {
      return new Response(
        JSON.stringify({ error: 'No Google Calendar connected' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    if (action === 'cancel') {
      // Delete the calendar event
      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events/${booking.calendar_event_id}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${integration.access_token}`,
          },
        }
      )

      if (!response.ok && response.status !== 404) {
        const error = await response.text()
        console.error('Failed to delete calendar event:', error)
        return new Response(
          JSON.stringify({ error: 'Failed to delete calendar event' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        )
      }

      // Clear calendar event ID from booking
      await supabaseClient
        .from('bookings')
        .update({ calendar_event_id: null, calendar_synced_at: null })
        .eq('id', booking_id)

      return new Response(
        JSON.stringify({ success: true, action: 'deleted' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    if (action === 'update') {
      // Update the calendar event with new times
      const eventData = {
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
      }

      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events/${booking.calendar_event_id}`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${integration.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(eventData),
        }
      )

      if (!response.ok) {
        const error = await response.text()
        console.error('Failed to update calendar event:', error)
        return new Response(
          JSON.stringify({ error: 'Failed to update calendar event' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        )
      }

      const calendarEvent = await response.json()

      // Update sync timestamp
      await supabaseClient
        .from('bookings')
        .update({ calendar_synced_at: new Date().toISOString() })
        .eq('id', booking_id)

      return new Response(
        JSON.stringify({
          success: true,
          action: 'updated',
          html_link: calendarEvent.htmlLink,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action. Use "update" or "cancel"' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
