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
        companies(
          id,
          name,
          whop_company_id,
          booking_slug_prefix,
          branding_hide_badge
        )
      `,
        { head: false, count: null }
      )
      .eq('slug', slug)
      .eq('is_active', true)

    const { data: eventTypes, error } = await query

    if (error) {
      console.error('Event type query error:', error)
      return new Response(
        JSON.stringify({ error: error.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    if (!eventTypes || eventTypes.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Event type not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      )
    }

    // If product is provided, filter by Whop org (biz_) or booking slug prefix
    let eventType = eventTypes[0]
    if (product && eventTypes.length > 0) {
      const filtered = eventTypes.filter((et: any) => {
        if (!et.companies) return false
        if (product.startsWith('biz_')) {
          return et.companies.whop_company_id === product
        } else {
          return et.companies.booking_slug_prefix === product
        }
      })
      if (filtered.length > 0) {
        eventType = filtered[0]
      } else if (eventTypes.length === 1) {
        // If only one event type matches the slug, use it even if product doesn't match
        eventType = eventTypes[0]
      } else {
        return new Response(
          JSON.stringify({ error: 'Event type not found for this product' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
        )
      }
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
