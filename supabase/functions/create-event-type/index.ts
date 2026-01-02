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
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      )
    }

    // Create client with user's JWT for authentication
    const supabaseAuth = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    )

    // Verify user's JWT token
    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser()
    if (userError || !user) {
      console.error('Auth error:', userError)
      return new Response(
        JSON.stringify({ error: 'Unauthorized', details: userError?.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      )
    }

    // Create admin client for database operations (bypasses RLS)
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const eventData = await req.json()

    // Get user's company
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single()

    let companyId = profile?.company_id

    // If no company exists, create one
    if (!companyId) {
      const companyName = user.user_metadata?.company_name || user.user_metadata?.name || user.email?.split('@')[0] || 'My Company'
      
      const { data: newCompany, error: companyError } = await supabaseClient
        .from('companies')
        .insert({ name: companyName })
        .select()
        .single()

      if (companyError || !newCompany) {
        console.error('Failed to create company:', companyError)
        return new Response(
          JSON.stringify({ error: 'Failed to create company for user' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        )
      }

      companyId = newCompany.id

      // Update profile with company_id
      await supabaseClient
        .from('profiles')
        .update({ company_id: companyId })
        .eq('id', user.id)
    }

    // Create event type
    const { data: eventType, error: createError } = await supabaseClient
      .from('event_types')
      .insert({
        ...eventData,
        user_id: user.id,
        company_id: companyId,
      })
      .select()
      .single()

    if (createError) {
      console.error('Event type creation error:', createError)
      return new Response(
        JSON.stringify({ error: createError.message, detail: createError.details }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    return new Response(
      JSON.stringify({ event_type: eventType }),
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
