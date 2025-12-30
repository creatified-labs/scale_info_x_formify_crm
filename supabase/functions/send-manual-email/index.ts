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

    const { booking_ids, template_id, custom_message, company_id } = await req.json()

    if (!booking_ids || !Array.isArray(booking_ids) || booking_ids.length === 0) {
      return new Response(
        JSON.stringify({ error: 'booking_ids must be a non-empty array' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    const fromEmail = Deno.env.get('FROM_EMAIL') || 'noreply@yourdomain.com'

    let sentCount = 0
    let failedCount = 0
    const results: any[] = []

    for (const bookingId of booking_ids) {
      try {
        // Get booking details
        const { data: booking } = await supabaseClient
          .from('bookings')
          .select(`
            *,
            event_types (
              name,
              company_id
            )
          `)
          .eq('id', bookingId)
          .single()

        if (!booking) {
          failedCount++
          results.push({ booking_id: bookingId, status: 'failed', error: 'Booking not found' })
          continue
        }

        // Get template if specified
        let subject = 'Message from your booking'
        let body = custom_message || ''

        if (template_id) {
          const { data: template } = await supabaseClient
            .from('email_templates')
            .select('*')
            .eq('id', template_id)
            .single()

          if (template) {
            subject = template.subject
            body = template.body

            // Replace variables
            const startTime = new Date(booking.start_time)
            const variables: Record<string, string> = {
              '{{invitee_name}}': booking.invitee_name,
              '{{event_name}}': booking.event_types?.name || 'Meeting',
              '{{call_date}}': startTime.toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric',
                timeZone: booking.invitee_timezone 
              }),
              '{{call_time}}': startTime.toLocaleTimeString('en-US', { 
                hour: 'numeric', 
                minute: '2-digit',
                timeZone: booking.invitee_timezone 
              }),
              '{{location}}': booking.meet_link || booking.location_text || 'TBD',
            }

            for (const [key, value] of Object.entries(variables)) {
              subject = subject.replace(new RegExp(key, 'g'), value)
              body = body.replace(new RegExp(key, 'g'), value)
            }
          }
        }

        // Send email
        if (!resendApiKey) {
          // Log but don't send
          await supabaseClient.from('email_logs').insert({
            booking_id: bookingId,
            template_id: template_id || null,
            recipient_email: booking.invitee_email,
            subject,
            sent_at: new Date().toISOString(),
            status: 'skipped',
            error_message: 'Email service not configured',
            company_id: company_id || booking.event_types?.company_id,
          })

          sentCount++
          results.push({ booking_id: bookingId, status: 'logged', recipient: booking.invitee_email })
          continue
        }

        const emailResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: fromEmail,
            to: [booking.invitee_email],
            subject,
            text: body,
          }),
        })

        const emailData = await emailResponse.json()

        // Log email
        await supabaseClient.from('email_logs').insert({
          booking_id: bookingId,
          template_id: template_id || null,
          recipient_email: booking.invitee_email,
          subject,
          sent_at: new Date().toISOString(),
          status: emailResponse.ok ? 'sent' : 'failed',
          message_id: emailData.id || null,
          error_message: emailResponse.ok ? null : JSON.stringify(emailData),
          company_id: company_id || booking.event_types?.company_id,
        })

        if (emailResponse.ok) {
          sentCount++
          results.push({ booking_id: bookingId, status: 'sent', recipient: booking.invitee_email })
        } else {
          failedCount++
          results.push({ booking_id: bookingId, status: 'failed', error: emailData })
        }
      } catch (error) {
        failedCount++
        results.push({ booking_id: bookingId, status: 'failed', error: error.message })
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        sent_count: sentCount,
        failed_count: failedCount,
        total: booking_ids.length,
        results,
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
