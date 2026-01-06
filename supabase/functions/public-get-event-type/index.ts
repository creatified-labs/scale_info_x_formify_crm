import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client with service role key (bypasses RLS for public access)
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get query parameters
    const url = new URL(req.url)
    const slug = url.searchParams.get('slug')
    const product = url.searchParams.get('product')

    console.log('Public event type request:', { slug, product })

    if (!slug) {
      return new Response(
        JSON.stringify({ error: 'Missing slug parameter' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Query event type by slug
    // If product is provided, also filter by company's whop_company_id
    let query = supabaseClient
      .from('event_types')
      .select(
        `
        *,
        companies!inner(
          id,
          name,
          whop_company_id,
          booking_slug_prefix
        )
      `,
        { head: false, count: null }
      )
      .eq('slug', slug)
      .eq('is_active', true)

    // If product is provided, filter by Whop org (biz_) or booking slug prefix
    if (product) {
      if (product.startsWith('biz_')) {
        query = query.eq('companies.whop_company_id', product)
      } else {
        query = query.eq('companies.booking_slug_prefix', product)
      }
    }

    const { data: eventType, error } = await query.single()

    if (error) {
      console.error('Event type query error:', error)

      // Return 404 if not found
      if (error.code === 'PGRST116') {
        return new Response(
          JSON.stringify({ error: 'Event type not found' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
        )
      }

      return new Response(
        JSON.stringify({ error: error.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    if (!eventType) {
      return new Response(
        JSON.stringify({ error: 'Event type not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      )
    }

    console.log('Event type found:', { id: eventType.id, slug: eventType.slug })

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
