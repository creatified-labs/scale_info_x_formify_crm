import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
}

// Helper function to create a Date object representing a specific time in a specific timezone
function createTimeInTimezone(dateObj: Date, timeStr: string, timezone: string): Date {
  const [hour, minute] = timeStr.split(':').map(Number);
  const dateStr = dateObj.toISOString().split('T')[0]; // YYYY-MM-DD

  // Create ISO string representing the local time in the target timezone
  const localISO = `${dateStr}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`;

  // Parse this as UTC first
  const asUTC = new Date(localISO + 'Z');

  // Use Intl.DateTimeFormat to find what this UTC time looks like in the target timezone
  // Using 'sv-SE' locale gives us ISO 8601 format: "YYYY-MM-DD HH:MM:SS"
  const formattedInTZ = new Intl.DateTimeFormat('sv-SE', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(asUTC);

  // Parse the result as UTC to get the time value
  const shownInTZ = new Date(formattedInTZ.replace(' ', 'T') + 'Z');

  // Calculate offset between what we wanted and what it showed
  const offset = asUTC.getTime() - shownInTZ.getTime();

  // Apply the offset to get the correct UTC time that represents our desired local time
  return new Date(asUTC.getTime() + offset);
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client with service role key (public endpoint, bypasses RLS)
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get query parameters
    const url = new URL(req.url)
    const eventTypeId = url.searchParams.get('event_type_id')
    const from = url.searchParams.get('from')
    const to = url.searchParams.get('to')

    console.log('List availability request:', { eventTypeId, from, to })

    if (!eventTypeId || !from || !to) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters: event_type_id, from, to' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Get event type
    const { data: eventType, error: eventTypeError } = await supabaseClient
      .from('event_types')
      .select('*, availability_schedule_id')
      .eq('id', eventTypeId)
      .eq('is_active', true)
      .single()

    if (eventTypeError || !eventType) {
      console.error('Event type not found:', eventTypeError)
      return new Response(
        JSON.stringify({ error: 'Event type not found or inactive' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      )
    }

    // Determine which availability schedule to use
    let scheduleId = eventType.availability_schedule_id

    // If no schedule specified, get user's default schedule
    if (!scheduleId) {
      const { data: defaultSchedule } = await supabaseClient
        .from('availability_schedules')
        .select('id, timezone')
        .eq('user_id', eventType.user_id)
        .eq('is_default', true)
        .single()

      scheduleId = defaultSchedule?.id
      console.log(`Using default schedule for user ${eventType.user_id}: ${scheduleId}`)
    } else {
      console.log(`Using event-specific schedule: ${scheduleId}`)
    }

    // Get the schedule's timezone
    let scheduleTimezone = 'UTC'
    if (scheduleId) {
      const { data: schedule } = await supabaseClient
        .from('availability_schedules')
        .select('timezone')
        .eq('id', scheduleId)
        .single()

      scheduleTimezone = schedule?.timezone || 'UTC'
    } else {
      // Fallback to user's profile timezone if no schedule
      const { data: userProfile } = await supabaseClient
        .from('profiles')
        .select('timezone')
        .eq('id', eventType.user_id)
        .single()

      scheduleTimezone = userProfile?.timezone || 'UTC'
    }

    console.log(`Schedule timezone: ${scheduleTimezone}`)

    if (!scheduleId) {
      console.log('No availability schedule found for user')
      return new Response(
        JSON.stringify({ slots: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    const fromDate = new Date(from)
    const toDate = new Date(to)
    const weekday = fromDate.getDay() // 0 = Sunday, 6 = Saturday

    // Get availability rules for this schedule and weekday
    const { data: availabilityRules } = await supabaseClient
      .from('availability_rules')
      .select('*')
      .eq('schedule_id', scheduleId)
      .eq('weekday', weekday)

    // Get availability overrides for this schedule and date
    const dateStr = fromDate.toISOString().split('T')[0]
    const { data: overrides } = await supabaseClient
      .from('availability_overrides')
      .select('*')
      .eq('schedule_id', scheduleId)
      .eq('date', dateStr)

    // Check if day is blocked
    const blockedOverride = overrides?.find(o => !o.is_available)
    if (blockedOverride) {
      console.log('Date is blocked by override')
      return new Response(
        JSON.stringify({ slots: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    // Use override times if available, otherwise use regular availability rules
    let availableRanges: Array<{ start: string; end: string }> = []

    if (overrides && overrides.length > 0) {
      availableRanges = overrides
        .filter(o => o.is_available && o.start_time && o.end_time)
        .map(o => ({ start: o.start_time!, end: o.end_time! }))
    } else if (availabilityRules && availabilityRules.length > 0) {
      availableRanges = availabilityRules.map(r => ({
        start: r.start_time,
        end: r.end_time,
      }))
    } else {
      // No availability set for this day
      console.log('No availability rules for this weekday')
      return new Response(
        JSON.stringify({ slots: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    // Generate time slots
    const slots: Array<{ start_time: string; end_time: string }> = []
    const duration = eventType.duration || 30 // minutes
    const bufferBefore = eventType.buffer_before || 0
    const bufferAfter = eventType.buffer_after || 0
    const timeIncrement = eventType.time_increment || duration

    for (const range of availableRanges) {
      // Parse time strings (HH:MM format) and interpret them in the schedule's timezone
      // This ensures that if user sets "9:00 AM" in Eastern time for this schedule, it's treated as Eastern 9 AM, not UTC 9 AM
      let currentSlotStart = createTimeInTimezone(fromDate, range.start, scheduleTimezone)
      const rangeEnd = createTimeInTimezone(fromDate, range.end, scheduleTimezone)

      // Generate slots with time increment
      while (currentSlotStart < rangeEnd) {
        const slotEnd = new Date(currentSlotStart.getTime() + duration * 60000)

        // Check if slot fits within available range
        if (slotEnd <= rangeEnd) {
          slots.push({
            start_time: currentSlotStart.toISOString(),
            end_time: slotEnd.toISOString(),
          })
        }

        // Move to next slot
        currentSlotStart = new Date(currentSlotStart.getTime() + timeIncrement * 60000)
      }
    }

    // Filter out slots that are too soon (min_notice_hours)
    const minNoticeHours = eventType.min_notice_hours || 0
    const minNoticeDate = new Date(Date.now() + minNoticeHours * 60 * 60 * 1000)
    let filteredSlots = slots.filter(slot => new Date(slot.start_time) >= minNoticeDate)

    console.log(`After min notice filter: ${filteredSlots.length}/${slots.length} slots`)

    // Get existing bookings that might conflict (for THIS user, across ALL event types)
    // This ensures archived event bookings still block availability
    const { data: existingBookings } = await supabaseClient
      .from('bookings')
      .select('start_time, end_time')
      .eq('host_user_id', eventType.user_id)
      .in('status', ['scheduled', 'confirmed'])
      .gte('start_time', fromDate.toISOString())
      .lte('end_time', toDate.toISOString())

    // Filter out slots that conflict with existing bookings
    if (existingBookings && existingBookings.length > 0) {
      filteredSlots = filteredSlots.filter(slot => {
        const slotStart = new Date(slot.start_time)
        const slotEnd = new Date(slot.end_time)

        // Check if this slot conflicts with any booking
        return !existingBookings.some(booking => {
          const bookingStart = new Date(booking.start_time)
          const bookingEnd = new Date(booking.end_time)

          // Slots conflict if they overlap
          return slotStart < bookingEnd && slotEnd > bookingStart
        })
      })
      console.log(`After booking conflicts filter: ${filteredSlots.length} slots`)
    }

    // Get time blocks (manual blocks) - time_blocks uses date + minutes format
    const { data: timeBlocks } = await supabaseClient
      .from('time_blocks')
      .select('date, start_minutes, end_minutes, scope, event_type_id')
      .eq('owner_user_id', eventType.user_id)
      .eq('date', dateStr)

    // Filter out slots that conflict with time blocks
    if (timeBlocks && timeBlocks.length > 0) {
      console.log(`Found ${timeBlocks.length} time blocks for ${dateStr}`)

      filteredSlots = filteredSlots.filter(slot => {
        const slotStart = new Date(slot.start_time)
        const slotEnd = new Date(slot.end_time)

        return !timeBlocks.some(block => {
          // Only consider blocks that apply to this event type
          if (block.scope === 'event_only' && block.event_type_id !== eventTypeId) {
            return false
          }

          // Convert minutes to actual times for this date
          const blockStart = new Date(fromDate)
          blockStart.setHours(0, 0, 0, 0)
          blockStart.setMinutes(block.start_minutes)

          const blockEnd = new Date(fromDate)
          blockEnd.setHours(0, 0, 0, 0)
          blockEnd.setMinutes(block.end_minutes)

          // Slots conflict if they overlap
          const conflicts = slotStart < blockEnd && slotEnd > blockStart
          if (conflicts) {
            console.log(`Slot ${slotStart.toISOString()} blocked by time block ${block.start_minutes}-${block.end_minutes}`)
          }
          return conflicts
        })
      })
      console.log(`After time blocks filter: ${filteredSlots.length} slots`)
    }

    // Check Google Calendar for conflicts if integration is enabled
    const { data: company } = await supabaseClient
      .from('profiles')
      .select('company_id')
      .eq('id', eventType.user_id)
      .maybeSingle()

    if (company?.company_id) {
      const { data: companySettings } = await supabaseClient
        .from('companies')
        .select('settings')
        .eq('id', company.company_id)
        .maybeSingle()

      const settings = companySettings?.settings as any
      const checkConflicts = settings?.google_calendar?.check_conflicts ?? true
      const selectedCalendarIds = settings?.google_calendar?.selected_calendars || []

      if (checkConflicts && selectedCalendarIds.length > 0) {
        // Get Google Calendar integration
        const { data: integration } = await supabaseClient
          .from('user_integrations')
          .select('access_token, refresh_token, expires_at')
          .eq('user_id', eventType.user_id)
          .eq('provider', 'google')
          .maybeSingle()

        if (integration?.access_token) {
          console.log(`Checking Google Calendar conflicts for ${selectedCalendarIds.length} calendars`)

          // Check if token needs refresh
          let accessToken = integration.access_token
          const expiresAt = integration.expires_at ? new Date(integration.expires_at) : null
          const now = new Date()
          
          if (expiresAt && expiresAt <= now && integration.refresh_token) {
            console.log('Access token expired, refreshing for conflict check...')
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
                
                console.log('Token refreshed successfully for conflict check')
              }
            } catch (refreshErr) {
              console.error('Token refresh failed for conflict check:', refreshErr)
            }
          }

          // Fetch Google Calendar events for the date range
          const googleEvents: Array<{ start: string; end: string }> = []

          for (const calendarId of selectedCalendarIds) {
            try {
              const response = await fetch(
                `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?` +
                `timeMin=${encodeURIComponent(fromDate.toISOString())}&` +
                `timeMax=${encodeURIComponent(toDate.toISOString())}&` +
                `singleEvents=true`,
                {
                  headers: {
                    Authorization: `Bearer ${accessToken}`,
                  },
                }
              )

              if (response.ok) {
                const data = await response.json() as { items?: any[] }
                const events = data.items || []

                // Filter out declined events and all-day events
                const busyEvents = events.filter((event: any) => {
                  if (event.start?.date) return false // All-day event
                  if (event.attendees?.some((a: any) => a.self && a.responseStatus === 'declined')) return false
                  return true
                })

                googleEvents.push(...busyEvents.map((e: any) => ({
                  start: e.start?.dateTime,
                  end: e.end?.dateTime,
                })))
              }
            } catch (error) {
              console.error(`Error fetching calendar ${calendarId}:`, error)
            }
          }

          // Filter out slots that conflict with Google Calendar events
          if (googleEvents.length > 0) {
            filteredSlots = filteredSlots.filter(slot => {
              const slotStart = new Date(slot.start_time)
              const slotEnd = new Date(slot.end_time)

              return !googleEvents.some(event => {
                const eventStart = new Date(event.start)
                const eventEnd = new Date(event.end)

                // Slots conflict if they overlap
                return slotStart < eventEnd && slotEnd > eventStart
              })
            })
            console.log(`After Google Calendar conflicts filter: ${filteredSlots.length} slots (found ${googleEvents.length} Google events)`)
          }
        }
      }
    }

    console.log(`Final available slots: ${filteredSlots.length}`)

    return new Response(
      JSON.stringify({
        slots: filteredSlots,
        timezone: scheduleTimezone // Include timezone so frontend can display times correctly
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
