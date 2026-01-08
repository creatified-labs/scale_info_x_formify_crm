import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Type definitions
interface UpdateEventTypeBody {
  id?: string
  user_id?: string
  [key: string]: any // For other event type fields
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json() as UpdateEventTypeBody
    const { id, user_id, ...eventData } = body
    const { permanent_delete: permanentDelete, ...updateFields } = eventData

    // Check if this is a dev proxy request (from /api/edge-proxy)
    const isDevProxy = req.headers.get('X-Dev-Proxy') === 'true'
    let userId = user_id

    // If NOT using dev proxy, verify JWT and get user from token
    if (!isDevProxy) {
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

      userId = user.id
    }

    // If using dev proxy and no user_id provided, return error
    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'Missing user_id in payload for dev proxy' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Create admin client for database operations (bypasses RLS)
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

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

    if (!existingEvent || existingEvent.user_id !== userId) {
      return new Response(
        JSON.stringify({ error: 'Event type not found or unauthorized' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      )
    }

    // Get user's company
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('company_id')
      .eq('id', userId)
      .single()

    let companyId = profile?.company_id

    // If no company exists, create one
    if (!companyId) {
      const { data: newCompany, error: companyError } = await supabaseClient
        .from('companies')
        .insert({ name: 'My Company' })
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
        .eq('id', userId)
    }

    if (permanentDelete) {
      console.log(`🗑️ Permanently deleting event type ${id}...`)

      // Delete related data in order (to avoid foreign key constraints)

      // 1. Delete time blocks for this event type
      const { error: timeBlocksError } = await supabaseClient
        .from('time_blocks')
        .delete()
        .eq('event_type_id', id)

      if (timeBlocksError) {
        console.warn('Failed to delete time blocks:', timeBlocksError)
      } else {
        console.log('✅ Deleted time blocks')
      }

      // 2. Delete bookings for this event type
      const { error: bookingsError } = await supabaseClient
        .from('bookings')
        .delete()
        .eq('event_type_id', id)

      if (bookingsError) {
        console.warn('Failed to delete bookings:', bookingsError)
      } else {
        console.log('✅ Deleted bookings')
      }

      // 3. Delete analytics for this event type
      const { error: analyticsError } = await supabaseClient
        .from('event_type_analytics')
        .delete()
        .eq('event_type_id', id)

      if (analyticsError) {
        console.warn('Failed to delete analytics:', analyticsError)
      } else {
        console.log('✅ Deleted analytics')
      }

      // 4. Finally, delete the event type itself
      const { error: deleteError } = await supabaseClient
        .from('event_types')
        .delete()
        .eq('id', id)

      if (deleteError) {
        console.error('❌ Event type delete error:', deleteError)
        return new Response(
          JSON.stringify({ error: deleteError.message, detail: deleteError.details }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
      }

      console.log('✅ Event type permanently deleted')

      return new Response(
        JSON.stringify({ deleted: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    // Update event type
    const { data: eventType, error: updateError } = await supabaseClient
      .from('event_types')
      .update(updateFields)
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
