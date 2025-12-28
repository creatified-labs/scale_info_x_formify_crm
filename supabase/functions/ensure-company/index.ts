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

    const {
      data: { user },
    } = await supabaseClient.auth.getUser()

    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401,
        },
      )
    }

    const body = await req.json()
    const { whop_org_id } = body

    if (!whop_org_id) {
      return new Response(
        JSON.stringify({ error: 'Missing whop_org_id' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        },
      )
    }

    // Check if company already exists
    const { data: existingCompany } = await supabaseClient
      .from('companies')
      .select('id')
      .eq('id', whop_org_id)
      .maybeSingle()

    if (existingCompany) {
      return new Response(
        JSON.stringify({ company_id: existingCompany.id }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        },
      )
    }

    // Create new company
    const { data: newCompany, error: insertError } = await supabaseClient
      .from('companies')
      .insert({
        id: whop_org_id,
        name: whop_org_id,
        plan_id: 'pro',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select('id')
      .single()

    if (insertError) {
      console.error('Failed to create company:', insertError)
      return new Response(
        JSON.stringify({ error: 'Failed to create company', details: insertError.message }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        },
      )
    }

    return new Response(
      JSON.stringify({ company_id: newCompany.id }),
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
        status: 500,
      },
    )
  }
})
