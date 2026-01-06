import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
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
      .select('*')
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

    const fromDate = new Date(from)
    const toDate = new Date(to)
    const weekday = fromDate.getDay() // 0 = Sunday, 6 = Saturday

    // Get user's availability rules for this weekday
    const { data: availabilityRules } = await supabaseClient
      .from('availability_rules')
      .select('*')
      .eq('user_id', eventType.user_id)
      .eq('weekday', weekday)

    // Get availability overrides for this specific date
    const dateStr = fromDate.toISOString().split('T')[0]
    const { data: overrides } = await supabaseClient
      .from('availability_overrides')
      .select('*')
      .eq('user_id', eventType.user_id)
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
      // Parse time strings (HH:MM format)
      const [startHour, startMin] = range.start.split(':').map(Number)
      const [endHour, endMin] = range.end.split(':').map(Number)

      let currentSlotStart = new Date(fromDate)
      currentSlotStart.setHours(startHour, startMin, 0, 0)

      const rangeEnd = new Date(fromDate)
      rangeEnd.setHours(endHour, endMin, 0, 0)

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

    // Get existing bookings that might conflict
    const { data: existingBookings } = await supabaseClient
      .from('bookings')
      .select('start_time, end_time')
      .eq('event_type_id', eventTypeId)
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

    // Get time blocks (manual blocks and synced Google Calendar events)
    const { data: timeBlocks } = await supabaseClient
      .from('time_blocks')
      .select('start_time, end_time, scope, event_type_id')
      .eq('user_id', eventType.user_id)
      .gte('start_time', fromDate.toISOString())
      .lte('end_time', toDate.toISOString())

    // Filter out slots that conflict with time blocks
    if (timeBlocks && timeBlocks.length > 0) {
      filteredSlots = filteredSlots.filter(slot => {
        const slotStart = new Date(slot.start_time)
        const slotEnd = new Date(slot.end_time)

        return !timeBlocks.some(block => {
          // Only consider blocks that apply to this event type
          if (block.scope === 'event_only' && block.event_type_id !== eventTypeId) {
            return false
          }

          const blockStart = new Date(block.start_time)
          const blockEnd = new Date(block.end_time)

          // Slots conflict if they overlap
          return slotStart < blockEnd && slotEnd > blockStart
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
          .select('access_token')
          .eq('user_id', eventType.user_id)
          .eq('provider', 'google')
          .maybeSingle()

        if (integration?.access_token) {
          console.log(`Checking Google Calendar conflicts for ${selectedCalendarIds.length} calendars`)

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
                    Authorization: `Bearer ${integration.access_token}`,
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
      JSON.stringify({ slots: filteredSlots }),
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
