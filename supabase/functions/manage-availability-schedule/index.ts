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

    // Create clients
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const body = await req.json() as {
      action?: string;
      schedule_id?: string;
      name?: string;
      is_default?: boolean;
      user_id?: string;
    }
    const { action, schedule_id, name, is_default, user_id } = body

    // Check if this is a proxied request (has user_id in body and X-Dev-Proxy header)
    const isProxied = req.headers.get('X-Dev-Proxy') === 'true' && !!user_id
    
    console.log('🔍 Request details:', {
      hasProxyHeader: req.headers.get('X-Dev-Proxy'),
      hasUserId: !!user_id,
      userId: user_id,
      isProxied,
      action,
      authHeaderPresent: !!authHeader
    })
    
    let userId: string
    
    if (isProxied && user_id) {
      // Proxied request - use user_id from body
      userId = user_id
      console.log('✅ Using proxied user ID:', userId)
    } else {
      // Direct request - verify user with token
      console.log('⚠️ Not proxied, attempting direct auth')
      const supabaseAuth = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? '',
        { global: { headers: { Authorization: authHeader } } }
      )
      const { data: { user }, error: userError } = await supabaseAuth.auth.getUser()
      if (userError || !user) {
        console.error('❌ User verification failed:', userError)
        console.error('Auth header:', authHeader?.substring(0, 20) + '...')
        return new Response(
          JSON.stringify({ error: 'Unauthorized', details: userError?.message || 'No user found' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
        )
      }
      userId = user.id
      console.log('✅ Direct auth successful for user:', userId)
    }

    console.log(`✅ Action: ${action}, User: ${userId}`)

    // CREATE schedule
    if (action === 'create') {
      console.log('📝 Creating schedule:', { name, is_default, userId })
      
      if (!name || typeof name !== 'string' || name.trim().length === 0) {
        console.error('❌ Invalid name:', name)
        return new Response(
          JSON.stringify({ error: 'Schedule name is required' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
      }

      // Check if name already exists for this user
      console.log('🔍 Checking for existing schedule with name:', name.trim())
      const { data: existing, error: checkError } = await supabaseClient
        .from('availability_schedules')
        .select('id')
        .eq('user_id', userId)
        .eq('name', name.trim())
        .maybeSingle()

      if (checkError) {
        console.error('❌ Error checking existing schedules:', checkError)
      }

      if (existing) {
        console.log('⚠️ Schedule already exists')
        return new Response(
          JSON.stringify({ error: 'A schedule with this name already exists' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
      }

      // If setting as default, unset other defaults first
      if (is_default) {
        await supabaseClient
          .from('availability_schedules')
          .update({ is_default: false })
          .eq('user_id', userId)
          .eq('is_default', true)
      }

      const { data, error } = await supabaseClient
        .from('availability_schedules')
        .insert({
          user_id: userId,
          name: name.trim(),
          is_default: is_default || false
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating schedule:', error)
        return new Response(
          JSON.stringify({ error: error.message }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
      }

      console.log(`Created schedule: ${name} (${data.id})`)
      return new Response(
        JSON.stringify({ schedule: data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    // UPDATE schedule
    if (action === 'update') {
      if (!schedule_id) {
        return new Response(
          JSON.stringify({ error: 'schedule_id is required for update' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
      }

      // Verify ownership
      const { data: schedule } = await supabaseClient
        .from('availability_schedules')
        .select('user_id, is_default')
        .eq('id', schedule_id)
        .single()

      if (!schedule || schedule.user_id !== userId) {
        return new Response(
          JSON.stringify({ error: 'Schedule not found or access denied' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
        )
      }

      // If setting as default, unset other defaults first
      if (is_default === true) {
        await supabaseClient
          .from('availability_schedules')
          .update({ is_default: false })
          .eq('user_id', userId)
          .eq('is_default', true)
          .neq('id', schedule_id)
      }

      const updates: any = { updated_at: new Date().toISOString() }
      if (name && name.trim().length > 0) updates.name = name.trim()
      if (is_default !== undefined) updates.is_default = is_default

      const { data, error } = await supabaseClient
        .from('availability_schedules')
        .update(updates)
        .eq('id', schedule_id)
        .select()
        .single()

      if (error) {
        console.error('Error updating schedule:', error)
        return new Response(
          JSON.stringify({ error: error.message }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
      }

      console.log(`Updated schedule: ${schedule_id}`)
      return new Response(
        JSON.stringify({ schedule: data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    // DELETE schedule
    if (action === 'delete') {
      if (!schedule_id) {
        return new Response(
          JSON.stringify({ error: 'schedule_id is required for delete' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
      }

      // Verify ownership
      const { data: schedule } = await supabaseClient
        .from('availability_schedules')
        .select('user_id, is_default')
        .eq('id', schedule_id)
        .single()

      if (!schedule || schedule.user_id !== userId) {
        return new Response(
          JSON.stringify({ error: 'Schedule not found or access denied' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
        )
      }

      // Check if schedule is in use by any event types
      const { data: eventTypes } = await supabaseClient
        .from('event_types')
        .select('id, name')
        .eq('availability_schedule_id', schedule_id)
        .limit(5)

      if (eventTypes && eventTypes.length > 0) {
        const eventNames = eventTypes.map(e => e.name).join(', ')
        return new Response(
          JSON.stringify({
            error: 'Cannot delete schedule: it is in use by event types',
            details: `This schedule is used by: ${eventNames}${eventTypes.length > 5 ? ' and more' : ''}`
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
      }

      // Prevent deleting the last schedule
      const { count } = await supabaseClient
        .from('availability_schedules')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)

      if (count && count <= 1) {
        return new Response(
          JSON.stringify({ error: 'Cannot delete the only availability schedule' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
      }

      // If deleting default schedule, set another one as default
      if (schedule.is_default) {
        const { data: otherSchedule } = await supabaseClient
          .from('availability_schedules')
          .select('id')
          .eq('user_id', userId)
          .neq('id', schedule_id)
          .limit(1)
          .single()

        if (otherSchedule) {
          await supabaseClient
            .from('availability_schedules')
            .update({ is_default: true })
            .eq('id', otherSchedule.id)
          console.log(`Set new default schedule: ${otherSchedule.id}`)
        }
      }

      // Delete the schedule (CASCADE will delete related rules and overrides)
      const { error } = await supabaseClient
        .from('availability_schedules')
        .delete()
        .eq('id', schedule_id)

      if (error) {
        console.error('Error deleting schedule:', error)
        return new Response(
          JSON.stringify({ error: error.message }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
      }

      console.log(`Deleted schedule: ${schedule_id}`)
      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    // SET DEFAULT schedule
    if (action === 'set_default') {
      if (!schedule_id) {
        return new Response(
          JSON.stringify({ error: 'schedule_id is required for set_default' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
      }

      // Verify ownership
      const { data: schedule } = await supabaseClient
        .from('availability_schedules')
        .select('user_id')
        .eq('id', schedule_id)
        .single()

      if (!schedule || schedule.user_id !== userId) {
        return new Response(
          JSON.stringify({ error: 'Schedule not found or access denied' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
        )
      }

      // Unset all other defaults for this user
      await supabaseClient
        .from('availability_schedules')
        .update({ is_default: false })
        .eq('user_id', userId)
        .eq('is_default', true)

      // Set this schedule as default
      const { error } = await supabaseClient
        .from('availability_schedules')
        .update({ is_default: true })
        .eq('id', schedule_id)

      if (error) {
        console.error('Error setting default schedule:', error)
        return new Response(
          JSON.stringify({ error: error.message }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
      }

      console.log(`Set default schedule: ${schedule_id}`)
      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action. Must be: create, update, delete, or set_default' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
