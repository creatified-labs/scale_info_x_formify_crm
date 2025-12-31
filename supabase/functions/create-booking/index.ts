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

    const payload = await req.json()
    const {
      event_type_id,
      invitee_name,
      invitee_email,
      invitee_phone,
      invitee_timezone,
      start_time,
      end_time,
      status,
      chosen_call_type,
      video_join_url,
      location_text,
      provider_pending,
      answers,
    } = payload

    // Get event type and company info
    const { data: eventType, error: eventTypeError } = await supabaseClient
      .from('event_types')
      .select('*, companies!inner(id, settings)')
      .eq('id', event_type_id)
      .single()

    if (eventTypeError || !eventType) {
      return new Response(
        JSON.stringify({ error: 'Event type not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      )
    }

    const companyId = eventType.companies?.id
    const settings = eventType.companies?.settings as any

    // Check calendar availability if enabled
    const checkConflicts = settings?.google_calendar?.check_conflicts ?? true
    if (checkConflicts) {
      const availabilityResponse = await fetch(
        `${Deno.env.get('SUPABASE_URL')}/functions/v1/check-calendar-availability`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            start_time,
            end_time,
            company_id: companyId,
          }),
        }
      )

      if (availabilityResponse.ok) {
        const availabilityData = await availabilityResponse.json()
        if (!availabilityData.available) {
          return new Response(
            JSON.stringify({ 
              error: 'Time slot is no longer available',
              conflicts: availabilityData.conflicts 
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 409 }
          )
        }
      }
    }

    // Check for duplicate booking (same email, event, and time within 5 minutes)
    const fiveMinutesAgo = new Date(new Date(start_time).getTime() - 5 * 60 * 1000).toISOString()
    const { data: recentBooking } = await supabaseClient
      .from('bookings')
      .select('id')
      .eq('event_type_id', event_type_id)
      .eq('invitee_email', invitee_email.toLowerCase())
      .gte('created_at', fiveMinutesAgo)
      .maybeSingle()

    if (recentBooking) {
      return new Response(
        JSON.stringify({ error: 'Duplicate booking detected. Please refresh the page.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 409 }
      )
    }

    // Create booking
    const { data: booking, error: bookingError } = await supabaseClient
      .from('bookings')
      .insert({
        event_type_id,
        host_user_id: eventType.user_id,
        invitee_name,
        invitee_email: invitee_email.toLowerCase(),
        invitee_phone,
        invitee_timezone,
        start_time,
        end_time,
        status,
        chosen_call_type,
        video_join_url,
        location_text,
        provider_pending,
        answers,
      })
      .select()
      .single()

    if (bookingError) {
      console.error('Booking creation error:', bookingError)
      return new Response(
        JSON.stringify({ error: 'Failed to create booking', details: bookingError.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    // Add to Google Calendar (async, don't wait)
    const autoAddToCalendar = settings?.google_calendar?.auto_add_bookings ?? true
    if (autoAddToCalendar) {
      fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/add-booking-to-calendar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ booking_id: booking.id }),
      }).catch(err => console.error('Calendar add error:', err))
    }

    // Send confirmation email (async, don't wait)
    fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-booking-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        booking_id: booking.id,
        template_type: 'booking_confirmation',
        recipient: invitee_email,
      }),
    }).catch(err => console.error('Email send error:', err))

    // Send host notification email (async, don't wait)
    const { data: hostProfile } = await supabaseClient
      .from('profiles')
      .select('email')
      .eq('id', eventType.user_id)
      .single()

    if (hostProfile?.email) {
      fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-booking-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          booking_id: booking.id,
          template_type: 'booking_notification',
          recipient: hostProfile.email,
        }),
      }).catch(err => console.error('Host notification error:', err))
    }

    return new Response(
      JSON.stringify({ success: true, booking }),
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
