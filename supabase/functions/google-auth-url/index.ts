import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID')!
const GOOGLE_REDIRECT_URI = Deno.env.get('GOOGLE_REDIRECT_URI') || 'https://rwmmiosgsncsxiehkyyd.supabase.co/functions/v1/google-exchange-token'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-dev-proxy',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const scope = url.searchParams.get('scope') || 'calendar'
    const whopOrgId = url.searchParams.get('whop_org_id')
    const whopEmail = url.searchParams.get('whop_email')
    const whopName = url.searchParams.get('whop_name')
    const stateOverride = url.searchParams.get('state_override')

    console.log('google-auth-url received params:', { scope, whopOrgId, hasStateOverride: !!stateOverride })

    // Google OAuth scopes
    const scopes = scope === 'meet'
      ? [
          'https://www.googleapis.com/auth/calendar',
          'https://www.googleapis.com/auth/calendar.events',
        ]
      : [
          'https://www.googleapis.com/auth/calendar',
          'https://www.googleapis.com/auth/calendar.events',
        ]

    // Use state override if provided (from frontend), otherwise encode Whop identity
    let stateParam: string;

    if (stateOverride) {
      // Frontend already encoded the state with user_id
      stateParam = stateOverride;
      console.log('Using state override from frontend (includes user_id)');
    } else {
      // Fallback: Encode Whop identity in OAuth state parameter
      let stateData = {}
      if (whopOrgId) {
        stateData = {
          whop_org_id: whopOrgId,
          whop_email: whopEmail,
          whop_name: whopName,
        }
        console.log('Encoding Whop identity in state parameter')
      }

      // Use Deno's built-in base64 encoding
      const encoder = new TextEncoder()
      const data = encoder.encode(JSON.stringify(stateData))
      stateParam = btoa(String.fromCharCode(...data))
    }

    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
    authUrl.searchParams.set('client_id', GOOGLE_CLIENT_ID)
    authUrl.searchParams.set('redirect_uri', GOOGLE_REDIRECT_URI)
    authUrl.searchParams.set('response_type', 'code')
    authUrl.searchParams.set('scope', scopes.join(' '))
    authUrl.searchParams.set('access_type', 'offline')
    authUrl.searchParams.set('prompt', 'consent')
    authUrl.searchParams.set('state', stateParam)
    
    console.log('OAuth URL generated with state parameter')

    return new Response(
      JSON.stringify({ url: authUrl.toString() }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})
