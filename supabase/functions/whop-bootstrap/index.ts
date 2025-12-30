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
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    const body = await req.json()
    const {
      whop_org_id,
      whop_email,
      whop_name,
      whop_username,
      whop_user_id,
      whop_profile_picture,
    } = body

    console.log('Whop bootstrap request:', {
      whop_org_id,
      whop_email,
      whop_name,
      whop_user_id,
    })

    if (!whop_org_id) {
      throw new Error('Missing whop_org_id')
    }

    // 1. Find or create company
    let company
    const { data: existingCompany } = await supabaseClient
      .from('companies')
      .select('*')
      .eq('whop_company_id', whop_org_id)
      .single()

    if (existingCompany) {
      company = existingCompany
      console.log('Found existing company:', company.id)
    } else {
      // Create new company - use whop_org_id as the ID
      const { data: newCompany, error: companyError } = await supabaseClient
        .from('companies')
        .insert({
          id: whop_org_id, // Use Whop org ID as company ID
          name: whop_name || whop_org_id,
          whop_company_id: whop_org_id,
        })
        .select()
        .single()

      if (companyError) {
        console.error('Failed to create company:', companyError)
        throw new Error(`Failed to create company: ${companyError.message}`)
      }

      company = newCompany
      console.log('Created new company:', company.id)
    }

    // 2. Find or create user
    let user
    let authUser

    // Try to find existing user by Whop user ID or email
    if (whop_user_id) {
      const { data: existingUser } = await supabaseClient
        .from('users')
        .select('*')
        .eq('whop_user_id', whop_user_id)
        .single()

      if (existingUser) {
        user = existingUser
        console.log('Found existing user by Whop user ID:', user.id)
      }
    }

    if (!user && whop_email) {
      const { data: existingUser } = await supabaseClient
        .from('users')
        .select('*')
        .eq('email', whop_email)
        .single()

      if (existingUser) {
        user = existingUser
        console.log('Found existing user by email:', user.id)
      }
    }

    if (!user) {
      // No user found in users table - create new user
      const userEmail = whop_email || `${whop_org_id}@whop.placeholder`
      
      // Create auth user with upsert behavior
      const { data: authData, error: authError } = await supabaseClient.auth.admin.createUser({
        email: userEmail,
        email_confirm: true,
        user_metadata: {
          whop_org_id,
          whop_user_id,
          whop_name,
          whop_username,
          whop_profile_picture,
        },
      })

      if (authError) {
        // If user already exists in auth, try to find them by email in users table
        if (authError.message.includes('already been registered')) {
          console.log('Auth user exists, looking up in users table by email...')
          const { data: existingUserByEmail } = await supabaseClient
            .from('users')
            .select('*')
            .eq('email', userEmail)
            .single()
          
          if (existingUserByEmail) {
            user = existingUserByEmail
            console.log('Found existing user by email after auth conflict:', user.id)
            
            // Update with latest Whop data
            await supabaseClient
              .from('users')
              .update({
                name: whop_name || user.name,
                whop_user_id: whop_user_id || user.whop_user_id,
                avatar_url: whop_profile_picture || user.avatar_url,
                company_id: company.id,
              })
              .eq('id', user.id)
          } else {
            throw new Error(`Auth user exists but no user record found for email: ${userEmail}`)
          }
        } else {
          console.error('Failed to create auth user:', authError)
          throw new Error(`Failed to create auth user: ${authError.message}`)
        }
      } else {
        // Successfully created auth user, now create user record
        authUser = authData.user
        console.log('Created auth user:', authUser.id)

        const { data: newUser, error: userError } = await supabaseClient
          .from('users')
          .insert({
            id: authUser.id,
            email: userEmail,
            name: whop_name,
            company_id: company.id,
            whop_user_id: whop_user_id,
            avatar_url: whop_profile_picture,
          })
          .select()
          .single()

        if (userError) {
          console.error('Failed to create user:', userError)
          throw new Error(`Failed to create user: ${userError.message}`)
        }

        user = newUser
        console.log('Created new user:', user.id)
      }
    } else {
      // Update existing user with latest Whop data
      const { error: updateError } = await supabaseClient
        .from('users')
        .update({
          name: whop_name || user.name,
          whop_user_id: whop_user_id || user.whop_user_id,
          avatar_url: whop_profile_picture || user.avatar_url,
          company_id: company.id,
        })
        .eq('id', user.id)

      if (updateError) {
        console.error('Failed to update user:', updateError)
      } else {
        console.log('Updated user with latest Whop data')
      }
    }

    // 3. Create session token for the user using service role
    // Generate a session by creating an access token
    const { data: sessionData, error: sessionError } = await supabaseClient.auth.admin.createUser({
      email: user.email,
      email_confirm: true,
      user_metadata: {
        whop_org_id,
        whop_user_id,
      },
    })

    // If user already exists, that's fine - we just need to generate a session
    // Use the existing user ID to create a session token
    const sessionToken = await supabaseClient.auth.admin.generateLink({
      type: 'magiclink',
      email: user.email,
    })

    if (sessionError && !sessionError.message.includes('already been registered')) {
      console.error('Failed to generate session:', sessionError)
    }

    return new Response(
      JSON.stringify({
        success: true,
        user_id: user.id,
        company_id: company.id,
        whop_org_id,
        access_token: sessionToken.data?.properties?.hashed_token,
        session_url: sessionToken.data?.properties?.action_link,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Whop bootstrap error:', error)
    return new Response(
      JSON.stringify({
        error: error.message,
        details: error.toString(),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
