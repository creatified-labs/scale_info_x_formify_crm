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

    const body = await req.json() as {
      whop_org_id: string;
      whop_email?: string;
      whop_name?: string;
      whop_username?: string;
      whop_user_id?: string;
      whop_profile_picture?: string;
    }
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
      console.log('Creating new company with data:', {
        id: whop_org_id,
        name: whop_name || whop_org_id,
        whop_company_id: whop_org_id,
      })
      
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
        console.error('Failed to create company:', {
          error: companyError,
          message: companyError.message,
          details: companyError.details,
          hint: companyError.hint,
          code: companyError.code,
        })
        return new Response(
          JSON.stringify({
            error: 'Failed to create company',
            details: companyError.message,
            code: companyError.code,
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
          }
        )
      }

      if (!newCompany) {
        console.error('Company creation returned no data')
        return new Response(
          JSON.stringify({
            error: 'Company creation returned no data',
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
          }
        )
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
      
      // Try to create the auth user with metadata
      const { data: authData, error: authError } = await supabaseClient.auth.admin.createUser({
        email: userEmail,
        email_confirm: true,
        user_metadata: {
          company_id: company.id,
          whop_org_id: whop_org_id,
          whop_user_id,
          whop_name,
          whop_username,
          whop_profile_picture,
        },
      })

      if (authError) {
        // If user already exists in auth, look them up and create user record if needed
        if (authError.message.includes('already been registered')) {
          console.log('Auth user exists, looking up auth user...')
          
          // Get the auth user by email
          const { data: { users: authUsers }, error: listError } = await supabaseClient.auth.admin.listUsers()
          
          if (!listError && authUsers) {
            authUser = authUsers.find(u => u.email === userEmail)
            
            if (authUser) {
              console.log('Found auth user:', authUser.id)
              
              // Try to find user record by auth user ID
              const { data: existingUserByAuthId } = await supabaseClient
                .from('users')
                .select('*')
                .eq('id', authUser.id)
                .single()
              
              if (existingUserByAuthId) {
                user = existingUserByAuthId
                console.log('Found existing user record:', user.id)
                
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
                // Auth user exists but no user record - create it
                console.log('Creating user record for existing auth user...')
                const { data: newUser, error: insertError } = await supabaseClient
                  .from('users')
                  .insert({
                    id: authUser.id,
                    email: userEmail,
                    name: whop_name || whop_username || 'Whop User',
                    whop_user_id,
                    avatar_url: whop_profile_picture,
                    company_id: company.id,
                  })
                  .select()
                  .single()
                
                if (insertError) {
                  console.error('Failed to create user record:', insertError)
                  throw new Error(`Failed to create user record: ${insertError.message}`)
                }
                
                user = newUser
                console.log('Created user record:', user.id)
              }
            } else {
              throw new Error(`Auth user not found for email: ${userEmail}`)
            }
          } else {
            throw new Error('Failed to list auth users')
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

    // 3. Update user metadata with company_id (for existing users)
    console.log('Updating user metadata with company_id:', company.id)
    const { error: updateMetadataError } = await supabaseClient.auth.admin.updateUserById(
      user.id,
      {
        user_metadata: {
          company_id: company.id,
          whop_org_id: whop_org_id,
          whop_user_id,
          whop_name,
          whop_username,
          whop_profile_picture,
        }
      }
    )
    
    if (updateMetadataError) {
      console.error('Failed to update user metadata:', updateMetadataError)
    } else {
      console.log('Successfully updated user metadata')
    }

    // 4. Generate access tokens for the user
    // IMPORTANT: Generate tokens AFTER updating metadata so they include the company_id
    console.log('Generating session tokens for user:', user.id)
    
    const { data: tokenData, error: tokenError } = await supabaseClient.auth.admin.generateLink({
      type: 'magiclink',
      email: user.email,
    })

    if (tokenError) {
      console.error('Failed to generate tokens:', tokenError)
      return new Response(
        JSON.stringify({
          error: 'Failed to generate session tokens',
          details: tokenError.message,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      )
    }

    // Extract tokens from the magic link
    const actionLink = tokenData?.properties?.action_link
    let accessToken = null
    let refreshToken = null
    
    if (actionLink) {
      try {
        const url = new URL(actionLink)
        accessToken = url.searchParams.get('access_token')
        refreshToken = url.searchParams.get('refresh_token')
        
        console.log('Extracted tokens from magic link:', {
          hasAccessToken: !!accessToken,
          hasRefreshToken: !!refreshToken,
        })
      } catch (e) {
        console.error('Failed to parse action link:', e)
      }
    }
    
    console.log('Returning bootstrap response with company_id:', company.id)

    return new Response(
      JSON.stringify({
        success: true,
        user_id: user.id,
        company_id: company.id,
        whop_org_id,
        access_token: accessToken,
        refresh_token: refreshToken,
        session_url: actionLink,
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
