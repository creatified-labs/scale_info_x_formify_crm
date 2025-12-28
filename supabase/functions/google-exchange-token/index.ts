import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID')!
const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET')!
const GOOGLE_REDIRECT_URI = Deno.env.get('GOOGLE_REDIRECT_URI') || 'https://rwmmiosgsncsxiehkyyd.supabase.co/functions/v1/google-exchange-token'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Handle both POST (from client) and GET (from Google OAuth redirect)
    const url = new URL(req.url)
    let code: string | null = null
    
    if (req.method === 'GET') {
      // OAuth callback from Google
      code = url.searchParams.get('code')
      
      if (!code) {
        // Redirect to the callback page with error
        return new Response(null, {
          status: 302,
          headers: {
            'Location': `${Deno.env.get('NEXT_PUBLIC_APP_URL') || 'http://localhost:3000'}/oauth/callback?error=missing_code`,
          },
        })
      }
      
      // For GET requests (OAuth callback), redirect to the app's callback page
      // The app will then call this function via POST with the code
      return new Response(null, {
        status: 302,
        headers: {
          'Location': `${Deno.env.get('NEXT_PUBLIC_APP_URL') || 'http://localhost:3000'}/oauth/callback?code=${code}`,
        },
      })
    }

    // POST request from client app
    const authHeader = req.headers.get('Authorization')
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      authHeader ? {
        global: {
          headers: { Authorization: authHeader },
        },
      } : {}
    )

    // Try to get authenticated user, but don't require it
    const {
      data: { user },
    } = await supabaseClient.auth.getUser()

    const body = await req.json()
    code = body.code

    if (!code) {
      throw new Error('Missing authorization code')
    }

    // Exchange code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: GOOGLE_REDIRECT_URI,
        grant_type: 'authorization_code',
      }),
    })

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text()
      console.error('Google token exchange failed:', errorText)
      throw new Error(`Token exchange failed: ${errorText}`)
    }

    const tokens = await tokenResponse.json()

    // Get user info from Google
    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
      },
    })

    const userInfo = await userInfoResponse.json()

    // Calculate expiration time
    const expiresAt = new Date()
    expiresAt.setSeconds(expiresAt.getSeconds() + tokens.expires_in)

    // User must be authenticated to store integration
    if (!user) {
      return new Response(
        JSON.stringify({ 
          error: 'Authentication required',
          detail: 'Please sign in to connect your Google account',
          tokens: {
            access_token: tokens.access_token,
            email: userInfo.email,
          }
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401,
        },
      )
    }

    // Store integration in database
    const { error: dbError } = await supabaseClient
      .from('user_integrations')
      .upsert({
        user_id: user.id,
        provider: 'google',
        email: userInfo.email,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: expiresAt.toISOString(),
        scope: tokens.scope,
        metadata: {
          picture: userInfo.picture,
          name: userInfo.name,
        },
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,provider'
      })

    if (dbError) {
      console.error('Database error:', dbError)
      throw new Error(`Failed to store integration: ${dbError.message}`)
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        email: userInfo.email,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})
