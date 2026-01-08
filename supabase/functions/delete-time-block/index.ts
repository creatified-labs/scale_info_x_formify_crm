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
      id: string;
      user_id?: string;
    }

    const { id, user_id } = body

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

    if (!id) {
      return new Response(
        JSON.stringify({ error: 'Block ID is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Delete the time block (ensuring it belongs to the user)
    const { error } = await supabaseClient
      .from('time_blocks')
      .delete()
      .eq('id', id)
      .eq('owner_user_id', userId)

    if (error) {
      console.error('Error deleting time block:', error)
      throw error
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error: any) {
    console.error('Error in delete-time-block:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
