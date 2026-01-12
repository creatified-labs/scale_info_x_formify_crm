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
    )

    const { event_type_id, type } = await req.json() as { event_type_id: string; type: 'view' | 'submission' }

    if (!event_type_id || !type) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: event_type_id, type' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    if (type !== 'view' && type !== 'submission') {
      return new Response(
        JSON.stringify({ error: 'Invalid type. Must be "view" or "submission"' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    console.log(`Tracking ${type} for event type ${event_type_id}`)

    if (type === 'view') {
      // Increment view count
      const { error } = await supabaseClient.rpc('increment_event_analytics_view', {
        event_type_id_param: event_type_id
      })

      if (error) {
        console.error('Error incrementing view:', error)
        return new Response(
          JSON.stringify({ error: 'Failed to track view', details: error.message }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        )
      }
    } else if (type === 'submission') {
      // Increment submission count
      const { error } = await supabaseClient.rpc('increment_event_analytics_submission', {
        event_type_id_param: event_type_id
      })

      if (error) {
        console.error('Error incrementing submission:', error)
        return new Response(
          JSON.stringify({ error: 'Failed to track submission', details: error.message }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        )
      }
    }

    return new Response(
      JSON.stringify({ success: true, type, event_type_id }),
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
