import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface GoogleCalendar {
  id: string
  summary: string
  primary?: boolean
  accessRole: string
  backgroundColor?: string
}

interface GoogleCalendarListResponse {
  items: GoogleCalendar[]
}

interface RequestBody {
  user_id?: string
}

interface TokenResponse {
  access_token: string
  expires_in: number
  refresh_token?: string
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get user_id from query params (passed by edge-proxy for GET requests)
    const url = new URL(req.url)
    let userId = url.searchParams.get('user_id') || undefined

    // Fallback to body for POST requests
    if (!userId && req.method === 'POST') {
      try {
        const body = await req.json() as RequestBody
        userId = body?.user_id
      } catch {
        // Ignore JSON parse errors
      }
    }

    // Validate we have a user ID
    if (!userId) {
      console.error('[list-google-calendars] Missing user_id in request')
      throw new Error('Missing user_id')
    }

    console.log('[list-google-calendars] Fetching calendars for user:', userId)

    // Create admin client for database operations (bypasses RLS)
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get user's Google integration
    const { data: integration, error: integrationError } = await supabaseClient
      .from('user_integrations')
      .select('access_token, refresh_token, expires_at')
      .eq('user_id', userId)
      .eq('provider', 'google')
      .single()

    if (integrationError || !integration) {
      console.error('[list-google-calendars] No Google integration found:', integrationError)
      throw new Error('Google Calendar not connected')
    }

    let accessToken = integration.access_token

    // Check if token is expired and refresh if needed
    const expiresAt = new Date(integration.expires_at)
    const now = new Date()

    if (expiresAt <= now && integration.refresh_token) {
      console.log('[list-google-calendars] Access token expired, refreshing...')

      // Refresh the token
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: Deno.env.get('GOOGLE_CLIENT_ID') ?? '',
          client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET') ?? '',
          refresh_token: integration.refresh_token,
          grant_type: 'refresh_token',
        }),
      })

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text()
        console.error('[list-google-calendars] Token refresh failed:', errorText)
        throw new Error('Failed to refresh Google token. Please reconnect Google Calendar.')
      }

      const tokens = await tokenResponse.json() as TokenResponse
      accessToken = tokens.access_token

      // Update stored token
      const newExpiresAt = new Date()
      newExpiresAt.setSeconds(newExpiresAt.getSeconds() + tokens.expires_in)

      const { error: updateError } = await supabaseClient
        .from('user_integrations')
        .update({
          access_token: accessToken,
          expires_at: newExpiresAt.toISOString(),
        })
        .eq('user_id', userId)
        .eq('provider', 'google')

      if (updateError) {
        console.error('[list-google-calendars] Failed to update token:', updateError)
      } else {
        console.log('[list-google-calendars] Token refreshed successfully')
      }
    }

    // Fetch calendar list from Google
    console.log('[list-google-calendars] Fetching calendar list from Google API...')
    const calendarResponse = await fetch(
      'https://www.googleapis.com/calendar/v3/users/me/calendarList',
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    )

    if (!calendarResponse.ok) {
      const errorText = await calendarResponse.text()
      console.error('[list-google-calendars] Calendar list fetch failed:', errorText)
      throw new Error('Failed to fetch calendars from Google')
    }

    const calendarData: GoogleCalendarListResponse = await calendarResponse.json()

    console.log(`[list-google-calendars] Found ${calendarData.items?.length || 0} calendars`)

    // Format calendar list for frontend
    const calendars = (calendarData.items || []).map((cal) => ({
      id: cal.id,
      name: cal.summary,
      primary: cal.primary || false,
      accessRole: cal.accessRole,
      color: cal.backgroundColor,
    }))

    return new Response(
      JSON.stringify({
        success: true,
        calendars,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    console.error('[list-google-calendars] Error:', error)
    return new Response(
      JSON.stringify({
        error: error.message,
        success: false,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})
