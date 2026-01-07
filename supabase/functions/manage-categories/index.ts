import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

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
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    const { action, category_id, name, color, company_id } = await req.json()

    if (!action) {
      return new Response(
        JSON.stringify({ error: 'action is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // LIST categories
    if (action === 'list') {
      if (!company_id) {
        return new Response(
          JSON.stringify({ error: 'company_id is required for list action' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
      }

      const { data, error } = await supabaseClient
        .from('revenue_categories')
        .select('*')
        .eq('company_id', company_id)
        .order('is_default', { ascending: false })
        .order('name', { ascending: true })

      if (error) {
        console.error('Error listing categories:', error)
        return new Response(
          JSON.stringify({ error: error.message }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        )
      }

      return new Response(
        JSON.stringify({ categories: data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    // CREATE category
    if (action === 'create') {
      if (!company_id || !name || !color) {
        return new Response(
          JSON.stringify({ error: 'company_id, name, and color are required for create action' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
      }

      const { data, error } = await supabaseClient
        .from('revenue_categories')
        .insert({
          company_id,
          name,
          color,
          is_default: false,
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating category:', error)
        return new Response(
          JSON.stringify({ error: error.message }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        )
      }

      return new Response(
        JSON.stringify({ category: data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    // UPDATE category
    if (action === 'update') {
      if (!category_id) {
        return new Response(
          JSON.stringify({ error: 'category_id is required for update action' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
      }

      const updateData: any = {}
      if (name) updateData.name = name
      if (color) updateData.color = color
      updateData.updated_at = new Date().toISOString()

      const { data, error } = await supabaseClient
        .from('revenue_categories')
        .update(updateData)
        .eq('id', category_id)
        .eq('is_default', false) // Can only update custom categories
        .select()
        .single()

      if (error) {
        console.error('Error updating category:', error)
        return new Response(
          JSON.stringify({ error: error.message }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        )
      }

      if (!data) {
        return new Response(
          JSON.stringify({ error: 'Category not found or cannot be updated (default categories cannot be modified)' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
        )
      }

      return new Response(
        JSON.stringify({ category: data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    // DELETE category
    if (action === 'delete') {
      if (!category_id) {
        return new Response(
          JSON.stringify({ error: 'category_id is required for delete action' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
      }

      const { error } = await supabaseClient
        .from('revenue_categories')
        .delete()
        .eq('id', category_id)
        .eq('is_default', false) // Can only delete custom categories

      if (error) {
        console.error('Error deleting category:', error)
        return new Response(
          JSON.stringify({ error: error.message }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        )
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action. Use: list, create, update, or delete' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  } catch (error: any) {
    console.error('Error in manage-categories function:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
