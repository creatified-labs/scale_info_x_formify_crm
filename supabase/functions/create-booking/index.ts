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

    const payload = await req.json() as {
      event_type_id: string;
      invitee_name: string;
      invitee_email: string;
      invitee_phone?: string;
      invitee_timezone: string;
      start_time: string;
      end_time: string;
      status: string;
      chosen_call_type?: string;
      video_join_url?: string;
      location_text?: string;
      provider_pending?: boolean;
      answers?: any;
    }
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
      .select('*, companies!inner(id, settings, branding_display_name, branding_name, primary_contact_email, notification_emails)')
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
        const availabilityData = await availabilityResponse.json() as { available: boolean; conflicts?: any }
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
        company_id: companyId,
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

    // Add to Google Calendar (inline to avoid inter-function auth issues)
    let meetLink = null
    let calendarError = null
    const autoAddToCalendar = settings?.google_calendar?.auto_add_bookings ?? true
    const autoCreateMeet = settings?.google_calendar?.auto_create_meet_links ?? true
    const targetCalendar = settings?.google_calendar?.add_events_to_calendar || 'primary'
    console.log(`Calendar settings - auto_add: ${autoAddToCalendar}, auto_create_meet: ${autoCreateMeet}, company_id: ${companyId}`)

    if (autoAddToCalendar) {
      try {
        console.log(`Adding booking ${booking.id} to Google Calendar`)
        
        // Get Google Calendar integration (including email for organizer)
        const { data: integration, error: integrationError } = await supabaseClient
          .from('user_integrations')
          .select('access_token, refresh_token, expires_at, email')
          .eq('user_id', eventType.user_id)
          .eq('provider', 'google')
          .maybeSingle()

        if (integrationError || !integration?.access_token) {
          calendarError = 'No Google Calendar connected'
          console.error(calendarError)
        } else {
          // Check if token needs refresh
          let accessToken = integration.access_token
          const expiresAt = integration.expires_at ? new Date(integration.expires_at) : null
          const now = new Date()
          
          if (expiresAt && expiresAt <= now && integration.refresh_token) {
            console.log('Access token expired, refreshing...')
            try {
              const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                  client_id: Deno.env.get('GOOGLE_CLIENT_ID') ?? '',
                  client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET') ?? '',
                  refresh_token: integration.refresh_token,
                  grant_type: 'refresh_token',
                }),
              })

              if (refreshResponse.ok) {
                const refreshData = await refreshResponse.json() as { access_token: string; expires_in: number }
                accessToken = refreshData.access_token
                const newExpiresAt = new Date(Date.now() + refreshData.expires_in * 1000)
                
                // Update the token in database
                await supabaseClient
                  .from('user_integrations')
                  .update({
                    access_token: accessToken,
                    expires_at: newExpiresAt.toISOString(),
                  })
                  .eq('user_id', eventType.user_id)
                  .eq('provider', 'google')
                
                console.log('Token refreshed successfully')
              } else {
                const error = await refreshResponse.text()
                console.error('Token refresh failed:', error)
                calendarError = 'Failed to refresh Google Calendar token'
              }
            } catch (refreshErr) {
              console.error('Token refresh exception:', refreshErr)
              calendarError = 'Failed to refresh Google Calendar token'
            }
          }
          
          if (!calendarError) {
          // Create calendar event
          const brandName = eventType.companies?.branding_display_name || eventType.companies?.branding_name || 'Scale Info'
          
          // Get organizer email - use Google Calendar integrated email or primary contact
          const organizerEmail = integration?.email || eventType.companies?.primary_contact_email || targetCalendar
          
          const eventData: any = {
            summary: `${eventType.name || 'Booking'} with ${brandName}`,
            description: eventType.description || `Meeting with ${invitee_name}`,
            start: {
              dateTime: start_time,
              timeZone: invitee_timezone,
            },
            end: {
              dateTime: end_time,
              timeZone: invitee_timezone,
            },
            organizer: {
              email: organizerEmail,
              displayName: brandName,
            },
            attendees: [
              { email: invitee_email, displayName: invitee_name },
            ],
          }

          // Add Google Meet conference if enabled
          if (autoCreateMeet) {
            eventData.conferenceData = {
              createRequest: {
                requestId: `booking-${booking.id}`,
                conferenceSolutionKey: { type: 'hangoutsMeet' },
              },
            }
          }

          console.log(`Creating calendar event on calendar: ${targetCalendar}`)

          const calendarResponse = await fetch(
            `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(targetCalendar)}/events?conferenceDataVersion=1&sendUpdates=all`,
            {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(eventData),
            }
          )

          console.log(`Google Calendar API response status: ${calendarResponse.status}`)

          if (calendarResponse.ok) {
            const calendarEvent = await calendarResponse.json() as {
              id: string
              htmlLink: string
              conferenceData?: {
                entryPoints?: Array<{ entryPointType: string; uri: string }>
              }
            }
            
            console.log(`Calendar event created: ${calendarEvent.id}`)
            
            meetLink = calendarEvent.conferenceData?.entryPoints?.find(
              (ep: any) => ep.entryPointType === 'video'
            )?.uri
            
            console.log(`Meet link extracted: ${meetLink}`)

            // Update booking with calendar event ID and meet link
            await supabaseClient
              .from('bookings')
              .update({
                calendar_event_id: calendarEvent.id,
                video_join_url: meetLink || booking.video_join_url,
                calendar_synced_at: new Date().toISOString(),
              })
              .eq('id', booking.id)
            
            console.log(`Updated booking with calendar data`)
          } else {
            const error = await calendarResponse.text()
            calendarError = `Google Calendar API error (${calendarResponse.status}): ${error}`
            console.error(calendarError)
          }
          }
        }
      } catch (err) {
        calendarError = `Calendar sync exception: ${err.message}`
        console.error('Calendar add error:', err)
      }
    } else {
      console.log('Auto-add to calendar is disabled in settings')
    }

    // Schedule email reminders if enabled
    const notifications = eventType.notifications as any
    if (notifications?.email?.enabled && notifications?.email?.reminders) {
      const reminders = notifications.email.reminders as number[] // Array of minutes before event
      const bookingStartTime = new Date(start_time)

      console.log(`Scheduling ${reminders.length} reminders for booking ${booking.id}`)

      for (const minutesBefore of reminders) {
        const scheduledFor = new Date(bookingStartTime.getTime() - minutesBefore * 60 * 1000)

        // Only schedule if the reminder time is in the future
        if (scheduledFor > new Date()) {
          const { error: reminderError } = await supabaseClient
            .from('email_reminders')
            .insert({
              booking_id: booking.id,
              reminder_type: 'booking_reminder',
              scheduled_for: scheduledFor.toISOString(),
              sent: false,
            })

          if (reminderError) {
            console.error(`Failed to schedule reminder for ${minutesBefore} minutes before:`, reminderError)
          } else {
            console.log(`Scheduled reminder for ${scheduledFor.toISOString()} (${minutesBefore} min before event)`)
          }
        } else {
          console.log(`Skipping reminder for ${minutesBefore} min before (would be in the past)`)
        }
      }
    }

    // Send confirmation email using template system
    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    const fromEmail = Deno.env.get('FROM_EMAIL') || 'no-reply@formifycrm.com'
    // Use dynamic brand name from company settings
    const brandName = eventType.companies?.branding_display_name || eventType.companies?.branding_name || 'Scale Info'
    const formattedFrom = fromEmail.includes('<') ? fromEmail : `${brandName} <${fromEmail}>`

    if (resendApiKey) {
      // Get email template for confirmation
      const { data: template } = await supabaseClient
        .from('email_templates')
        .select('*')
        .eq('company_id', companyId)
        .eq('name', 'booking_confirmation')
        .maybeSingle()

      // Default template if none found
      const defaultTemplate = {
        subject: 'Booking Confirmed: {{event_name}}',
        body: `Hi {{invitee_name}},\n\nYour booking for {{event_name}} has been confirmed!\n\nDate: {{call_date}}\nTime: {{call_time}}\nLocation: {{location}}\n\nLooking forward to speaking with you!\n\nBest regards,\n${brandName}`
      }

      const emailTemplate = template || defaultTemplate

      // Replace template variables
      const startTime = new Date(start_time)
      const variables: Record<string, string> = {
        '{{invitee_name}}': invitee_name,
        '{{event_name}}': eventType.name || 'Meeting',
        '{{call_date}}': startTime.toLocaleDateString('en-US', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric',
          timeZone: invitee_timezone 
        }),
        '{{call_time}}': startTime.toLocaleTimeString('en-US', { 
          hour: 'numeric', 
          minute: '2-digit',
          timeZone: invitee_timezone 
        }),
        '{{location}}': meetLink || location_text || 'TBD',
      }

      let subject = emailTemplate.subject
      let body = emailTemplate.body

      for (const [key, value] of Object.entries(variables)) {
        subject = subject.replace(new RegExp(key, 'g'), value)
        body = body.replace(new RegExp(key, 'g'), value)
      }

      console.log('Sending confirmation email to:', invitee_email)
      try {
        const emailRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: formattedFrom,
            to: [invitee_email],
            subject,
            html: body.replace(/\n/g, '<br>'),
            text: body,
          }),
        })
        
        const emailData = await emailRes.json() as any
        console.log('Confirmation email sent:', emailData)
        
        // Log email
        await supabaseClient.from('email_logs').insert({
          booking_id: booking.id,
          template_id: template?.id || null,
          recipient_email: invitee_email,
          subject,
          sent_at: new Date().toISOString(),
          status: emailRes.ok ? 'sent' : 'failed',
          message_id: emailData.id || null,
          error_message: emailRes.ok ? null : JSON.stringify(emailData),
          company_id: companyId,
        })
      } catch (err) {
        console.error('Email send error:', err)
      }

      // Send host notification email
      console.log('Looking up host email for user_id:', eventType.user_id)
      
      const { data: hostUser, error: hostUserError } = await supabaseClient
        .from('users')
        .select('email, id')
        .eq('id', eventType.user_id)
        .maybeSingle()

      console.log('Host user lookup result:', { hostUser, hostUserError })

      // Get host's Google Calendar integrated email
      const { data: googleIntegration } = await supabaseClient
        .from('user_integrations')
        .select('email')
        .eq('user_id', eventType.user_id)
        .eq('provider', 'google')
        .maybeSingle()

      console.log('Host Google integration email:', googleIntegration?.email)

      // Collect all notification emails
      const notificationEmails: string[] = []
      
      // Add host email if valid
      let hostEmail = hostUser?.email
      if (hostEmail && !hostEmail.includes('@whop.placeholder')) {
        notificationEmails.push(hostEmail)
      }
      
      // Add Google Calendar integrated email if available
      if (googleIntegration?.email && !notificationEmails.includes(googleIntegration.email)) {
        notificationEmails.push(googleIntegration.email)
      }
      
      // Add primary contact email if set
      if (eventType.companies?.primary_contact_email) {
        if (!notificationEmails.includes(eventType.companies.primary_contact_email)) {
          notificationEmails.push(eventType.companies.primary_contact_email)
        }
      }
      
      // Add all notification_emails from company settings
      const companyNotificationEmails = eventType.companies?.notification_emails || []
      for (const email of companyNotificationEmails) {
        if (email && !notificationEmails.includes(email)) {
          notificationEmails.push(email)
        }
      }

      console.log('Sending host notifications to:', notificationEmails)

      if (notificationEmails.length > 0) {
        try {
          const hostSubject = `New Booking: ${eventType.name} with ${invitee_name}`
          const hostBody = `You have a new booking!\n\nClient: ${invitee_name}\nEmail: ${invitee_email}\nEvent: ${eventType.name}\nDate: ${startTime.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: invitee_timezone })}\nTime: ${startTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: invitee_timezone })}\nDuration: ${eventType.duration_minutes} minutes\n\n${meetLink ? `Join URL: ${meetLink}\n\n` : ''}Check your calendar for details.`
          
          const hostEmailRes = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${resendApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from: formattedFrom,
              to: notificationEmails,
              subject: hostSubject,
              html: hostBody.replace(/\n/g, '<br>'),
              text: hostBody,
            }),
          })
          
          const hostEmailData = await hostEmailRes.json() as any
          console.log('Host notification sent:', hostEmailData)
          
          // Log email for each recipient
          for (const email of notificationEmails) {
            await supabaseClient.from('email_logs').insert({
              booking_id: booking.id,
              recipient_email: email,
              subject: hostSubject,
              sent_at: new Date().toISOString(),
              status: hostEmailRes.ok ? 'sent' : 'failed',
              message_id: hostEmailData.id || null,
              error_message: hostEmailRes.ok ? null : JSON.stringify(hostEmailData),
              company_id: companyId,
            })
          }
        } catch (err) {
          console.error('Host notification error:', err)
        }
      }

      // Send Whop push notification to host
      const whopApiKey = Deno.env.get('WHOP_API_KEY')
      if (whopApiKey && hostUser?.email) {
        try {
          // Get host's Whop user ID from users table
          const { data: hostWhopData } = await supabaseClient
            .from('users')
            .select('whop_user_id')
            .eq('id', eventType.user_id)
            .single()

          if (hostWhopData?.whop_user_id) {
            console.log('Sending Whop push notification to:', hostWhopData.whop_user_id)
            
            const notificationResponse = await fetch('https://api.whop.com/api/v5/notifications/push', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${whopApiKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                userIds: [hostWhopData.whop_user_id],
                title: '📅 New Booking',
                content: `${invitee_name} booked ${eventType.name}`,
                subtitle: startTime.toLocaleDateString('en-US', { 
                  weekday: 'short', 
                  month: 'short', 
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                  timeZone: invitee_timezone 
                }),
                restPath: '/calendar',
              }),
            })

            if (notificationResponse.ok) {
              console.log('Whop push notification sent successfully')
            } else {
              const errorText = await notificationResponse.text().catch(() => '')
              console.error('Failed to send Whop notification:', notificationResponse.status, errorText)
            }
          } else {
            console.log('Host has no Whop user ID - skipping push notification')
          }
        } catch (err) {
          console.error('Whop notification error:', err)
        }
      }
    } else {
      console.log('RESEND_API_KEY not configured - skipping email notifications')
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        booking: {
          ...booking,
          video_join_url: meetLink || booking.video_join_url,
        },
        meet_link: meetLink,
        calendar_sync_error: calendarError,
        debug: {
          auto_add_to_calendar: autoAddToCalendar,
          auto_create_meet: settings?.google_calendar?.auto_create_meet_links ?? true,
          company_id: companyId,
        },
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
