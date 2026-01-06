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
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      )
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    )

    const { booking_id, status } = await req.json() as { booking_id: string; status: string }

    if (!booking_id || !status) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: booking_id, status' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    console.log(`Updating booking ${booking_id} to status: ${status}`)

    // Get the current booking before updating
    const { data: currentBooking, error: fetchError } = await supabaseClient
      .from('bookings')
      .select('id, status, invitee_email, invitee_name, start_time, end_time, event_type_id')
      .eq('id', booking_id)
      .single()

    if (fetchError || !currentBooking) {
      return new Response(
        JSON.stringify({ error: 'Booking not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      )
    }

    const previousStatus = currentBooking.status

    // Update booking status
    const { error: updateError } = await supabaseClient
      .from('bookings')
      .update({ status })
      .eq('id', booking_id)

    if (updateError) {
      console.error('Failed to update booking status:', updateError)
      return new Response(
        JSON.stringify({ error: 'Failed to update booking status', details: updateError.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    // Handle status-specific actions
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    // If booking is cancelled, mark all pending reminders as sent (so they don't go out)
    if (status === 'cancelled' || status === 'canceled') {
      console.log('Marking pending reminders as sent for cancelled booking')

      const { error: reminderError } = await supabaseAdmin
        .from('email_reminders')
        .update({ sent: true, sent_at: new Date().toISOString() })
        .eq('booking_id', booking_id)
        .eq('sent', false)

      if (reminderError) {
        console.error('Failed to cancel reminders:', reminderError)
      }

      // Send cancellation email (async, don't wait)
      if (previousStatus !== 'cancelled' && previousStatus !== 'canceled') {
        console.log('Sending cancellation email')
        fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-booking-email`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
          },
          body: JSON.stringify({
            booking_id: booking_id,
            template_type: 'booking_cancelled',
            recipient: currentBooking.invitee_email,
          }),
        }).catch(err => console.error('Cancellation email error:', err))
      }
    }

    // If booking is marked as completed, mark reminders as sent
    if (status === 'completed') {
      const { error: reminderError } = await supabaseAdmin
        .from('email_reminders')
        .update({ sent: true, sent_at: new Date().toISOString() })
        .eq('booking_id', booking_id)
        .eq('sent', false)

      if (reminderError) {
        console.error('Failed to mark reminders as sent:', reminderError)
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Booking status updated to ${status}`,
        booking_id,
        previous_status: previousStatus,
        new_status: status,
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
