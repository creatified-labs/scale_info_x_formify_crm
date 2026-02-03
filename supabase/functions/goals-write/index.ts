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

    // Require authorization in production
    if (!isDev && !authHeader) {
      console.error('goals-write missing auth header in production. Origin:', origin)
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      )
    } else if (isDev) {
      console.log('Dev mode: Skipping JWT validation', { devProxy, origin })
    }

    // Create admin client for database operations (bypasses RLS)
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { action, payload } = await req.json() as { action: string; payload: Record<string, any> }

    if (action === 'create') {
      // Create a new goal
      const insertData = {
        company_id: payload.company_id,
        goal_type: payload.category_type || 'revenue',
        period_type: payload.period_key ? (payload.period_key.includes('-W') ? 'weekly' : payload.period_key.length === 4 ? 'yearly' : payload.period_key.length === 7 ? 'monthly' : 'daily') : 'deadline',
        target_amount: payload.target_amount,
        period_key: payload.period_key,
        deadline: payload.deadline,
        description: payload.description || payload.title,
        category: payload.category,
        category_name: payload.category_name,
        category_color: payload.category_color,
        category_type: payload.category_type,
        event_type_id: payload.event_type_id || null,
      }

      const { data: goal, error: createError } = await supabaseClient
        .from('sales_goals')
        .insert(insertData)
        .select()
        .single()

      if (createError) {
        console.error('Goal creation error:', createError)
        return new Response(
          JSON.stringify({ error: createError.message, detail: createError.details }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
      }

      return new Response(
        JSON.stringify(goal),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    } else if (action === 'delete') {
      // Delete a goal
      const { error: deleteError } = await supabaseClient
        .from('sales_goals')
        .delete()
        .eq('id', payload.id)

      if (deleteError) {
        console.error('Goal deletion error:', deleteError)
        return new Response(
          JSON.stringify({ error: deleteError.message }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    } else {
      return new Response(
        JSON.stringify({ error: 'Invalid action. Use "create" or "delete"' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }
  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
