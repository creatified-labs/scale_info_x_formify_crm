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
    // Create Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    const now = new Date().toISOString()
    console.log(`[${now}] Processing email reminders...`)

    // Get all unsent reminders that are due
    const { data: pendingReminders, error: fetchError } = await supabaseAdmin
      .from('email_reminders')
      .select(`
        id,
        booking_id,
        reminder_type,
        scheduled_for,
        bookings (
          id,
          invitee_email,
          invitee_name,
          start_time,
          end_time,
          status,
          event_types (
            id,
            name,
            notifications
          )
        )
      `)
      .eq('sent', false)
      .lte('scheduled_for', now)
      .order('scheduled_for', { ascending: true })
      .limit(100) // Process max 100 reminders per run

    if (fetchError) {
      console.error('Error fetching pending reminders:', fetchError)
      throw fetchError
    }

    if (!pendingReminders || pendingReminders.length === 0) {
      console.log('No pending reminders to process')
      return new Response(
        JSON.stringify({
          success: true,
          processed: 0,
          message: 'No pending reminders'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    console.log(`Found ${pendingReminders.length} pending reminders`)

    const results = []
    let successCount = 0
    let failureCount = 0

    // Process each reminder
    for (const reminder of pendingReminders) {
      try {
        const booking = reminder.bookings as any

        // Skip if booking is cancelled or not confirmed
        if (!booking || booking.status === 'cancelled') {
          console.log(`Skipping reminder ${reminder.id}: booking cancelled or not found`)

          // Mark as sent (so we don't keep retrying)
          await supabaseAdmin
            .from('email_reminders')
            .update({ sent: true, sent_at: new Date().toISOString() })
            .eq('id', reminder.id)

          results.push({ reminder_id: reminder.id, status: 'skipped', reason: 'booking_cancelled' })
          continue
        }

        // Skip if event is in the past
        if (new Date(booking.start_time) < new Date()) {
          console.log(`Skipping reminder ${reminder.id}: event is in the past`)

          await supabaseAdmin
            .from('email_reminders')
            .update({ sent: true, sent_at: new Date().toISOString() })
            .eq('id', reminder.id)

          results.push({ reminder_id: reminder.id, status: 'skipped', reason: 'event_past' })
          continue
        }

        // Check if email notifications are enabled for this event type
        const eventType = booking.event_types as any
        const notifications = eventType?.notifications as any

        if (!notifications?.email?.enabled) {
          console.log(`Skipping reminder ${reminder.id}: email notifications disabled`)

          await supabaseAdmin
            .from('email_reminders')
            .update({ sent: true, sent_at: new Date().toISOString() })
            .eq('id', reminder.id)

          results.push({ reminder_id: reminder.id, status: 'skipped', reason: 'notifications_disabled' })
          continue
        }

        // Call send-booking-email function
        console.log(`Sending ${reminder.reminder_type} for booking ${booking.id}`)

        const emailResponse = await fetch(
          `${Deno.env.get('SUPABASE_URL')}/functions/v1/send-booking-email`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
              'apikey': Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            },
            body: JSON.stringify({
              booking_id: booking.id,
              template_type: reminder.reminder_type,
              recipient: booking.invitee_email,
            }),
          }
        )

        if (!emailResponse.ok) {
          const errorText = await emailResponse.text()
          console.error(`Failed to send email for reminder ${reminder.id}:`, errorText)
          failureCount++
          results.push({
            reminder_id: reminder.id,
            status: 'failed',
            error: errorText.substring(0, 200)
          })
          continue
        }

        const emailResult = await emailResponse.json()
        console.log(`Email sent successfully for reminder ${reminder.id}:`, emailResult)

        // Mark reminder as sent
        await supabaseAdmin
          .from('email_reminders')
          .update({
            sent: true,
            sent_at: new Date().toISOString()
          })
          .eq('id', reminder.id)

        successCount++
        results.push({
          reminder_id: reminder.id,
          status: 'sent',
          message_id: emailResult.message_id
        })

      } catch (error) {
        console.error(`Error processing reminder ${reminder.id}:`, error)
        failureCount++
        results.push({
          reminder_id: reminder.id,
          status: 'error',
          error: error.message
        })
      }
    }

    console.log(`Reminder processing complete: ${successCount} sent, ${failureCount} failed`)

    return new Response(
      JSON.stringify({
        success: true,
        processed: pendingReminders.length,
        sent: successCount,
        failed: failureCount,
        results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    console.error('Error processing reminders:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
