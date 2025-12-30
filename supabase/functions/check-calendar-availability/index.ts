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
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    const { start_time, end_time, company_id } = await req.json()

    if (!start_time || !end_time || !company_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: start_time, end_time, company_id' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Get company settings to find selected calendars
    const { data: company, error: companyError } = await supabaseClient
      .from('companies')
      .select('settings')
      .eq('id', company_id)
      .single()

    if (companyError || !company) {
      return new Response(
        JSON.stringify({ error: 'Company not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      )
    }

    const settings = company.settings as any
    const selectedCalendarIds = settings?.google_calendar?.selected_calendars || []
    const checkConflicts = settings?.google_calendar?.check_conflicts ?? true

    // If conflict checking is disabled, return available
    if (!checkConflicts) {
      return new Response(
        JSON.stringify({ available: true, conflicts: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    // Get integration account with access token
    const { data: integration, error: integrationError } = await supabaseClient
      .from('integration_accounts')
      .select('access_token, refresh_token')
      .eq('company_id', company_id)
      .eq('provider', 'google_calendar')
      .maybeSingle()

    if (integrationError || !integration?.access_token) {
      // No Google Calendar connected - assume available
      return new Response(
        JSON.stringify({ available: true, conflicts: [], message: 'No calendar connected' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    // Check each selected calendar for conflicts
    const conflicts: any[] = []

    for (const calendarId of selectedCalendarIds) {
      try {
        const response = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?` +
          `timeMin=${encodeURIComponent(start_time)}&` +
          `timeMax=${encodeURIComponent(end_time)}&` +
          `singleEvents=true`,
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

        // Filter out declined events and all-day events
        const busyEvents = events.filter((event: any) => {
          if (event.start?.date) return false // All-day event
          if (event.attendees?.some((a: any) => a.self && a.responseStatus === 'declined')) return false
          return true
        })

        if (busyEvents.length > 0) {
          conflicts.push(...busyEvents.map((event: any) => ({
            calendar_id: calendarId,
            event_id: event.id,
            summary: event.summary,
            start: event.start?.dateTime,
            end: event.end?.dateTime,
          })))
        }
      } catch (error) {
        console.error(`Error checking calendar ${calendarId}:`, error)
      }
    }

    return new Response(
      JSON.stringify({
        available: conflicts.length === 0,
        conflicts,
        checked_calendars: selectedCalendarIds.length,
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
