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

    const { booking_id, template_type, recipient } = await req.json() as { booking_id: string; template_type: string; recipient: string }

    if (!booking_id || !template_type || !recipient) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Get booking details
    const { data: booking } = await supabaseClient
      .from('bookings')
      .select(`
        *,
        event_types (
          name,
          description,
          duration_minutes,
          company_id
        )
      `)
      .eq('id', booking_id)
      .single()

    if (!booking) {
      return new Response(
        JSON.stringify({ error: 'Booking not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      )
    }

    const companyId = booking.event_types?.company_id

    // Get email template
    const { data: template } = await supabaseClient
      .from('email_templates')
      .select('*')
      .eq('company_id', companyId)
      .eq('name', template_type)
      .maybeSingle()

    // Default templates if none found
    const defaultTemplates: Record<string, { subject: string; body: string }> = {
      'booking_confirmation': {
        subject: 'Booking Confirmed: {{event_name}}',
        body: `Hi {{invitee_name}},\n\nYour booking for {{event_name}} has been confirmed!\n\nDate: {{call_date}}\nTime: {{call_time}}\nLocation: {{location}}\n\nLooking forward to speaking with you!\n\nBest regards`
      },
      'booking_reminder_24h': {
        subject: 'Reminder: {{event_name}} tomorrow',
        body: `Hi {{invitee_name}},\n\nThis is a reminder that you have {{event_name}} scheduled for tomorrow.\n\nDate: {{call_date}}\nTime: {{call_time}}\nLocation: {{location}}\n\nSee you soon!`
      },
      'booking_reminder_1h': {
        subject: 'Starting soon: {{event_name}}',
        body: `Hi {{invitee_name}},\n\nYour {{event_name}} is starting in 1 hour.\n\nTime: {{call_time}}\nLocation: {{location}}\n\nSee you shortly!`
      },
      'booking_cancelled': {
        subject: 'Booking Cancelled: {{event_name}}',
        body: `Hi {{invitee_name}},\n\nYour booking for {{event_name}} on {{call_date}} at {{call_time}} has been cancelled.\n\nIf you'd like to reschedule, please visit our booking page.\n\nBest regards`
      },
      'booking_reminder': {
        subject: 'Reminder: {{event_name}} upcoming',
        body: `Hi {{invitee_name}},\n\nThis is a reminder that you have {{event_name}} scheduled.\n\nDate: {{call_date}}\nTime: {{call_time}}\nLocation: {{location}}\n\nLooking forward to speaking with you!\n\nBest regards`
      },
    }

    const emailTemplate = template || defaultTemplates[template_type]
    if (!emailTemplate) {
      return new Response(
        JSON.stringify({ error: 'Template not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      )
    }

    // Replace template variables
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

    let subject = emailTemplate.subject
    let body = emailTemplate.body

    for (const [key, value] of Object.entries(variables)) {
      subject = subject.replace(new RegExp(key, 'g'), value)
      body = body.replace(new RegExp(key, 'g'), value)
    }

    // Send email using Resend
    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    const fromEmail = Deno.env.get('FROM_EMAIL') || 'noreply@yourdomain.com'

    if (!resendApiKey) {
      console.warn('RESEND_API_KEY not configured')
      // Log email instead of sending
      await supabaseClient.from('email_logs').insert({
        booking_id,
        template_id: template?.id || null,
        recipient_email: recipient,
        subject,
        sent_at: new Date().toISOString(),
        status: 'skipped',
        error_message: 'Email service not configured',
        company_id: companyId,
      })

      return new Response(
        JSON.stringify({ 
          message: 'Email service not configured - email logged but not sent',
          subject,
          body 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    // Format from email with sender name (required by Resend)
    const fromName = Deno.env.get('FROM_NAME') || 'Scale Info'
    const formattedFrom = fromEmail.includes('<') ? fromEmail : `${fromName} <${fromEmail}>`
    
    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: formattedFrom,
        to: [recipient],
        subject,
        html: body.replace(/\n/g, '<br>'),
        text: body,
      }),
    })

    const emailData = await emailResponse.json() as { id?: string; [key: string]: any }

    // Log email
    await supabaseClient.from('email_logs').insert({
      booking_id,
      template_id: template?.id || null,
      recipient_email: recipient,
      subject,
      sent_at: new Date().toISOString(),
      status: emailResponse.ok ? 'sent' : 'failed',
      message_id: emailData.id || null,
      error_message: emailResponse.ok ? null : JSON.stringify(emailData),
      company_id: companyId,
    })

    if (!emailResponse.ok) {
      return new Response(
        JSON.stringify({ error: 'Failed to send email', details: emailData }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    return new Response(
      JSON.stringify({
        success: true,
        message_id: emailData.id,
        recipient,
        subject,
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
