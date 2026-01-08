import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'npm:@supabase/supabase-js@2'

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

    // Create clients
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const body = await req.json() as {
      scope: 'global_for_host' | 'event_only';
      event_type_id?: string | null;
      blocks: Array<{
        date: string;
        start_time: string;
        end_time: string;
        reason?: string;
        tz_at_create?: string;
      }>;
      user_id?: string;
    }

    const { scope, event_type_id, blocks, user_id } = body

    // Check if this is a proxied request (has user_id in body and X-Dev-Proxy header)
    const isProxied = req.headers.get('X-Dev-Proxy') === 'true' && !!user_id

    let userId: string

    if (isProxied) {
      // For proxied requests, use the user_id from the body
      userId = user_id!
      console.log('✅ Using proxied user_id:', userId)
    } else {
      // For direct requests, verify the JWT token
      const token = authHeader.replace('Bearer ', '')
      const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token)

      if (userError || !user) {
        console.error('❌ Auth error:', userError)
        return new Response(
          JSON.stringify({ error: 'Invalid or expired token' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
        )
      }

      userId = user.id
      console.log('✅ Using authenticated user_id:', userId)
    }

    if (!blocks || blocks.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No blocks provided' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Helper function to convert HH:MM to minutes
    const timeToMinutes = (time: string): number => {
      const [hours, minutes] = time.split(':').map(Number)
      return hours * 60 + minutes
    }

    // Get timezone from first block or default to UTC
    const timezone = blocks[0]?.tz_at_create || 'UTC'

    // For event_only scope, delete existing blocks for this event_type first
    if (scope === 'event_only' && event_type_id) {
      const { error: deleteError } = await supabaseClient
        .from('time_blocks')
        .delete()
        .eq('owner_user_id', userId)
        .eq('scope', 'event_only')
        .eq('event_type_id', event_type_id)

      if (deleteError) {
        console.error('Error deleting existing event blocks:', deleteError)
        throw deleteError
      }
    }

    // Prepare insert data
    const insertData = blocks.map(block => ({
      owner_user_id: userId,
      scope,
      event_type_id: scope === 'event_only' ? event_type_id : null,
      date: block.date,
      start_minutes: timeToMinutes(block.start_time),
      end_minutes: timeToMinutes(block.end_time),
      note: block.reason || null,
      tz_at_create: block.tz_at_create || timezone,
    }))

    // Insert new blocks
    const { data, error } = await supabaseClient
      .from('time_blocks')
      .insert(insertData)
      .select()

    if (error) {
      console.error('Error inserting time blocks:', error)
      throw error
    }

    return new Response(
      JSON.stringify({ success: true, blocks: data }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error: any) {
    console.error('Error in upsert-time-blocks:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
