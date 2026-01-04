import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-dev-proxy',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    const origin = req.headers.get('origin') || req.headers.get('referer') || ''
    const devProxy = req.headers.get('X-Dev-Proxy') === 'true'
    const isDev = devProxy || origin.includes('localhost') || origin.includes('127.0.0.1')

    console.log('Request info:', { hasAuthHeader: !!authHeader, origin, isDev, devProxy })

    // For dev mode, skip JWT validation entirely
    if (!isDev && !authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      )
    }

    let user = null

    // Only validate JWT if not in dev mode
    if (!isDev && authHeader) {
      const supabaseAuth = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? '',
        {
          global: {
            headers: { Authorization: authHeader },
          },
        }
      )

      const { data: { user: authUser }, error: userError } = await supabaseAuth.auth.getUser()

      if (userError || !authUser) {
        console.error('Auth error:', userError)
        return new Response(
          JSON.stringify({ error: 'Unauthorized', details: userError?.message }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
        )
      }

      user = authUser
    } else if (isDev) {
      console.log('Dev mode: Skipping JWT validation', { devProxy, origin })
    }

    // Create admin client for database operations (bypasses RLS)
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const eventData = await req.json() as Record<string, any>

    let companyId: string
    let userId: string | null = null

    // In dev mode, use company_id and user_id from request if provided
    if (isDev) {
      companyId = eventData.company_id
      userId = eventData.user_id || null

      if (!companyId) {
        return new Response(
          JSON.stringify({ error: 'company_id required in dev mode' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
      }

      // Remove from eventData so it's not duplicated in insert
      delete eventData.company_id
      delete eventData.user_id
    } else {
      // Production: Get user's company
      const { data: profile } = await supabaseClient
        .from('profiles')
        .select('company_id')
        .eq('id', user!.id)
        .single()

      companyId = profile?.company_id

      // If no company exists, create one
      if (!companyId) {
        const companyName = user!.user_metadata?.company_name || user!.user_metadata?.name || user!.email?.split('@')[0] || 'My Company'

        const newCompanyId = crypto.randomUUID()
        const { data: newCompany, error: companyError } = await supabaseClient
          .from('companies')
          .insert({
            id: newCompanyId,
            name: companyName
          })
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

        await supabaseClient
          .from('profiles')
          .update({ company_id: companyId })
          .eq('id', user!.id)
      }

      userId = user!.id
    }

    // Create event type
    const { data: eventType, error: createError } = await supabaseClient
      .from('event_types')
      .insert({
        ...eventData,
        user_id: userId,
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
