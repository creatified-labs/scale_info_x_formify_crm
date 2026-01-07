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
        
        // Get Google Calendar integration
        const { data: integration, error: integrationError } = await supabaseClient
          .from('user_integrations')
          .select('access_token, refresh_token, expires_at')
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
          const eventData: any = {
            summary: `${eventType.name || 'Booking'} with ${invitee_name}`,
            description: eventType.description || '',
            start: {
              dateTime: start_time,
              timeZone: invitee_timezone,
            },
            end: {
              dateTime: end_time,
              timeZone: invitee_timezone,
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
            `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(targetCalendar)}/events?conferenceDataVersion=1`,
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
