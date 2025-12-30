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
    const stateParam = body.state

    console.log('Received code:', code ? 'yes' : 'no')
    console.log('Received state:', stateParam ? 'yes' : 'no')
    
    // Extract Whop identity from OAuth state parameter
    let whopIdentity = null
    if (stateParam) {
      try {
        // Use Deno's built-in base64 decoding
        const decoded = atob(stateParam)
        const decoder = new TextDecoder()
        const bytes = Uint8Array.from(decoded, c => c.charCodeAt(0))
        const stateData = JSON.parse(decoder.decode(bytes))
        
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
      }
    }

    console.log('Received whop_identity:', whopIdentity ? 'yes' : 'no')
    if (whopIdentity) {
      console.log('Whop org ID:', whopIdentity.orgId)
    }

    if (!code) {
      throw new Error('Missing authorization code')
    }

    // If no user but we have Whop identity, create/get user with service role
    let effectiveUser = user
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
          
          // Create company record for Whop org
          const { error: companyError } = await supabaseAdmin
            .from('companies')
            .upsert({
              id: whopIdentity.orgId,
              name: whopIdentity.name || whopIdentity.orgId,
              created_at: new Date().toISOString(),
            }, {
              onConflict: 'id'
            })
          
          if (companyError) {
            console.error('Failed to create company record:', companyError)
          } else {
            console.log('Company record created:', whopIdentity.orgId)
          }
        }
      } else {
        console.log('Found existing user:', userId)
        // Get existing user
        const { data: existingUser } = await supabaseAdmin.auth.admin.getUserById(userId)
        effectiveUser = existingUser?.user || null
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

    // Store integration in database (use admin client if we created the user)
    const clientForInsert = effectiveUser.id === user?.id ? supabaseClient : createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    const { error: dbError } = await clientForInsert
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
