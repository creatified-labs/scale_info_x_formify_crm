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
    }
    const { whop_org_id } = body

    console.log('Whop auth request for org:', whop_org_id)

    if (!whop_org_id) {
      return new Response(
        JSON.stringify({ error: 'Missing whop_org_id' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Find user by company's whop_company_id
    const { data: company } = await supabaseClient
      .from('companies')
      .select('id')
      .eq('whop_company_id', whop_org_id)
      .single()

    if (!company) {
      return new Response(
        JSON.stringify({ error: 'Company not found for this Whop org' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      )
    }

    // Find user for this company
    const { data: user } = await supabaseClient
      .from('users')
      .select('id, email')
      .eq('company_id', company.id)
      .single()

    if (!user) {
      return new Response(
        JSON.stringify({ error: 'No user found for this company' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      )
    }

    console.log('Generating session for user:', user.id)

    // Get the auth user to generate tokens
    const { data: authUsers } = await supabaseClient.auth.admin.listUsers()
    const authUser = authUsers?.users?.find(u => u.id === user.id)

    if (!authUser) {
      return new Response(
        JSON.stringify({ error: 'Auth user not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      )
    }

    // Generate magic link to get tokens
    const { data: linkData, error: linkError } = await supabaseClient.auth.admin.generateLink({
      type: 'magiclink',
      email: authUser.email!,
    })

    if (linkError || !linkData) {
      console.error('Failed to generate magic link:', linkError)
      return new Response(
        JSON.stringify({ error: 'Failed to generate session' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    // Extract tokens from the hashed_token in the action_link
    // The action_link contains the tokens we need
    const actionLink = linkData.properties.action_link
    const url = new URL(actionLink)
    const hashedToken = url.searchParams.get('token_hash') || url.hash.split('#')[1]

    console.log('Session generated successfully')

    return new Response(
      JSON.stringify({
        action_link: actionLink,
        user_id: user.id,
        company_id: company.id,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Error in whop-auth:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})
