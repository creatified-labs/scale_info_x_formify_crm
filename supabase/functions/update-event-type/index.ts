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

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    )

    // Get authenticated user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      )
    }

    const { id, ...eventData } = await req.json()

    if (!id) {
      return new Response(
        JSON.stringify({ error: 'Event type ID is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Verify ownership
    const { data: existingEvent } = await supabaseClient
      .from('event_types')
      .select('user_id')
      .eq('id', id)
      .single()

    if (!existingEvent || existingEvent.user_id !== user.id) {
      return new Response(
        JSON.stringify({ error: 'Event type not found or unauthorized' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      )
    }

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

    // Update event type
    const { data: eventType, error: updateError } = await supabaseClient
      .from('event_types')
      .update(eventData)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Event type update error:', updateError)
      return new Response(
        JSON.stringify({ error: updateError.message, detail: updateError.details }),
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
