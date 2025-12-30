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

    const { company_id } = await req.json()

    if (!company_id) {
      return new Response(
        JSON.stringify({ error: 'Missing company_id' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Get company settings
    const { data: company } = await supabaseClient
      .from('companies')
      .select('settings')
      .eq('id', company_id)
      .single()

    const settings = company?.settings as any
    const syncExisting = settings?.google_calendar?.sync_existing_events ?? false
    const selectedCalendarIds = settings?.google_calendar?.selected_calendars || []

    if (!syncExisting) {
      return new Response(
        JSON.stringify({ message: 'Sync existing events is disabled', skipped: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    // Get integration account
    const { data: integration } = await supabaseClient
      .from('integration_accounts')
      .select('access_token, user_id')
      .eq('company_id', company_id)
      .eq('provider', 'google_calendar')
      .maybeSingle()

    if (!integration?.access_token) {
      return new Response(
        JSON.stringify({ error: 'No Google Calendar connected' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    const userId = integration.user_id
    const now = new Date()
    const futureDate = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000) // 90 days ahead

    let totalSynced = 0
    const blockedSlots: any[] = []

    // Sync events from each selected calendar
    for (const calendarId of selectedCalendarIds) {
      try {
        const response = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?` +
          `timeMin=${now.toISOString()}&` +
          `timeMax=${futureDate.toISOString()}&` +
          `singleEvents=true&` +
          `orderBy=startTime`,
          {
            headers: {
              Authorization: `Bearer ${integration.access_token}`,
            },
          }
        )

        if (!response.ok) {
          console.error(`Failed to fetch calendar ${calendarId}:`, response.statusText)
          continue
        }

        const data = await response.json()
        const events = data.items || []

        // Filter busy events (not declined, not all-day)
        const busyEvents = events.filter((event: any) => {
          if (event.start?.date) return false // All-day event
          if (event.attendees?.some((a: any) => a.self && a.responseStatus === 'declined')) return false
          return true
        })

        // Create time blocks for each busy event
        for (const event of busyEvents) {
          const startTime = new Date(event.start.dateTime)
          const endTime = new Date(event.end.dateTime)

          // Check if time block already exists
          const { data: existing } = await supabaseClient
            .from('time_blocks')
            .select('id')
            .eq('user_id', userId)
            .eq('start_time', startTime.toISOString())
            .eq('end_time', endTime.toISOString())
            .eq('scope', 'global_for_host')
            .maybeSingle()

          if (!existing) {
            // Create new time block
            const { error } = await supabaseClient
              .from('time_blocks')
              .insert({
                user_id: userId,
                event_type_id: null,
                start_time: startTime.toISOString(),
                end_time: endTime.toISOString(),
                scope: 'global_for_host',
                reason: `Calendar event: ${event.summary || 'Busy'}`,
              })

            if (!error) {
              totalSynced++
              blockedSlots.push({
                start: startTime.toISOString(),
                end: endTime.toISOString(),
                summary: event.summary,
              })
            }
          }
        }
      } catch (error) {
        console.error(`Error syncing calendar ${calendarId}:`, error)
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        synced_count: totalSynced,
        blocked_slots: blockedSlots,
        calendars_checked: selectedCalendarIds.length,
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
