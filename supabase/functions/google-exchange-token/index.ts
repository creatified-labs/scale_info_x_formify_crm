import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID')!
const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET')!
const GOOGLE_REDIRECT_URI = Deno.env.get('GOOGLE_REDIRECT_URI') || 'https://rwmmiosgsncsxiehkyyd.supabase.co/functions/v1/google-exchange-token'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-dev-proxy',
}

// Type definitions
interface RequestBody {
  code?: string
  state?: string
}

interface GoogleTokenResponse {
  access_token: string
  refresh_token?: string
  expires_in: number
  token_type: string
}

interface GoogleUserInfo {
  email: string
  name?: string
  picture?: string
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
      const state = url.searchParams.get('state')

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
      // The app will then call this function via POST with the code AND state
      const callbackUrl = new URL(`${Deno.env.get('NEXT_PUBLIC_APP_URL') || 'http://localhost:3000'}/oauth/callback`)
      callbackUrl.searchParams.set('code', code)
      if (state) {
        callbackUrl.searchParams.set('state', state)
      }

      return new Response(null, {
        status: 302,
        headers: {
          'Location': callbackUrl.toString(),
        },
      })
    }

    // POST request from client app
    // Check if this is a dev proxy request (from /api/edge-proxy)
    const isDevProxy = req.headers.get('X-Dev-Proxy') === 'true'
    const authHeader = req.headers.get('Authorization')

    let user: any = null

    // If NOT using dev proxy, try to get authenticated user from JWT
    if (!isDevProxy && authHeader) {
      const supabaseAuth = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? '',
        {
          global: {
            headers: { Authorization: authHeader },
          },
        }
      )

      // Try to get authenticated user, but don't require it
      const { data: { user: authUser } } = await supabaseAuth.auth.getUser()
      user = authUser
    }

    const body = await req.json() as RequestBody
    code = body.code
    const stateParam = body.state

    console.log('Received code:', code ? 'yes' : 'no')
    console.log('Received state:', stateParam ? 'yes' : 'no')
    console.log('State param value:', stateParam)

    // Extract state data (user_id, Whop identity) from OAuth state parameter
    let whopIdentity = null
    let stateUserId = null
    if (stateParam) {
      try {
        // Use Deno's built-in base64 decoding
        const decoded = atob(stateParam)
        console.log('Decoded state (raw):', decoded)
        const decoder = new TextDecoder()
        const bytes = Uint8Array.from(decoded, c => c.charCodeAt(0))
        const decodedStr = decoder.decode(bytes)
        console.log('Decoded state (string):', decodedStr)
        const stateData = JSON.parse(decodedStr)
        console.log('Parsed state data:', JSON.stringify(stateData))

        // Extract user_id from state (passed from main window)
        if (stateData.user_id) {
          stateUserId = stateData.user_id
          console.log('✅ User ID from state parameter:', stateUserId)
        } else {
          console.log('❌ No user_id in state data!')
        }

        if (stateData.whop_org_id) {
          whopIdentity = {
            orgId: stateData.whop_org_id,
            email: stateData.whop_email,
            name: stateData.whop_name
          }
          console.log('Whop identity from state parameter:', whopIdentity)
        }
      } catch (e) {
        console.error('Failed to decode state parameter:', e)
        console.error('Error details:', e.message, e.stack)
      }
    }

    console.log('Received state user_id:', stateUserId ? 'yes' : 'no')
    console.log('Received whop_identity:', whopIdentity ? 'yes' : 'no')
    if (whopIdentity) {
      console.log('Whop org ID:', whopIdentity.orgId)
    }

    if (!code) {
      throw new Error('Missing authorization code')
    }

    // Determine which user to use for the integration
    let effectiveUser = user
    console.log('Session user:', user ? user.id : 'none')
    console.log('State user_id:', stateUserId || 'none')

    // Priority 1: Use user_id from state parameter (passed from main window)
    // This ensures we use the SAME user as the main window, not the popup's session
    if (stateUserId) {
      console.log('✅ Using user ID from state parameter (main window user):', stateUserId)
      // Create a minimal user object with just the ID
      // We don't need to look up the full user object - just the ID is enough
      effectiveUser = { id: stateUserId } as any
      console.log('effectiveUser set to:', effectiveUser.id)
    } else {
      console.log('⚠️ No stateUserId - will use session user or create from Whop identity')
    }

    // Priority 2: If no user but we have Whop identity, create/get user with service role
    if (!effectiveUser && whopIdentity?.orgId) {
      console.log('Creating user from Whop identity:', whopIdentity)
      
      const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false
          }
        }
      )

      const email = whopIdentity.email || `${whopIdentity.orgId}@whop.temp`
      console.log('Looking for existing user with email:', email)
      
      // Try to find existing user
      const { data: existingUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers()
      if (listError) {
        console.error('Failed to list users:', listError)
      }
      
      let userId = existingUsers?.users?.find(u => u.email === email)?.id

      if (!userId) {
        console.log('User not found, creating new user')
        // Create new user
        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email,
          email_confirm: true,
          user_metadata: {
            name: whopIdentity.name || 'Whop User',
            whop_org_id: whopIdentity.orgId,
          }
        })

        if (createError) {
          console.error('Failed to create user from Whop identity:', createError)
          throw new Error(`Failed to create user: ${createError.message}`)
        } else {
          console.log('User created successfully:', newUser.user.id)
          userId = newUser.user.id
          effectiveUser = newUser.user

          // NOTE: Company creation is handled by /api/whop-session route
          // Do NOT create company here - it uses UUID IDs, not biz_xxx IDs
          // The whop-session route properly creates companies with correct ID format
          console.log('Company creation skipped - handled by whop-session route')
        }
      } else {
        console.log('Found existing user:', userId)
        // Use the user ID directly
        effectiveUser = { id: userId } as any
      }
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

    const tokens = await tokenResponse.json() as GoogleTokenResponse

    // Get user info from Google
    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
      },
    })

    const userInfo = await userInfoResponse.json() as GoogleUserInfo

    // Calculate expiration time
    const expiresAt = new Date()
    expiresAt.setSeconds(expiresAt.getSeconds() + tokens.expires_in)

    // User must exist to store integration
    if (!effectiveUser) {
      const errorDetail = whopIdentity?.orgId 
        ? `Failed to create user for Whop org ${whopIdentity.orgId}. Check Edge Function logs for details.`
        : 'No user session and no Whop identity provided. Please access through Whop.';
      
      return new Response(
        JSON.stringify({ 
          error: 'Authentication required',
          detail: errorDetail,
          whop_identity: whopIdentity,
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
    // Always use admin client since we're typically using dev proxy or state-based auth
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    const { error: dbError } = await supabaseAdmin
      .from('user_integrations')
      .upsert({
        user_id: effectiveUser.id,
        provider: 'google',
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: expiresAt.toISOString(),
        email: userInfo.email,
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
