import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-dev-proxy',
}

// Helper function to generate booking slug from display name
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '') // Remove all non-alphanumeric characters
    .replace(/^-+|-+$/g, '')    // Trim dashes from start/end
    .substring(0, 50);           // Limit to 50 characters
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    const isDevProxy = req.headers.get('X-Dev-Proxy') === 'true'

    // Create admin client for database operations (bypasses RLS)
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const body = await req.json() as Record<string, any>
    const brandingName = body.branding_name
    const brandingHideBadge = body.branding_hide_badge
    let userId = body.user_id

    // If not using dev proxy, verify JWT and get user
    if (!isDevProxy) {
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

    // Get user's company
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('company_id')
      .eq('id', userId)
      .single()

    if (!profile?.company_id) {
      return new Response(
        JSON.stringify({ error: 'User has no company' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Generate booking slug from branding name
    // If branding_name is empty/null, use company.name as fallback
    const { data: company } = await supabaseClient
      .from('companies')
      .select('name, booking_slug_prefix')
      .eq('id', profile.company_id)
      .single()

    const displayName = brandingName?.trim() || company?.name?.trim() || ''
    const oldSlug = company?.booking_slug_prefix || ''
    const newSlug = displayName ? slugify(displayName) : oldSlug

    // Check if the new slug is already taken by another company
    if (newSlug && newSlug !== oldSlug) {
      const { data: existing } = await supabaseClient
        .from('companies')
        .select('id')
        .eq('booking_slug_prefix', newSlug)
        .neq('id', profile.company_id)
        .maybeSingle()

      if (existing) {
        return new Response(
          JSON.stringify({
            error: 'Booking URL conflict',
            details: `The URL '/book/${newSlug}/...' is already taken. Please choose a different name.`,
            conflictingSlug: newSlug
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 409 }
        )
      }
    }

    // Update company branding and booking slug
    const updates: Record<string, any> = {}
    if (brandingName !== undefined) {
      updates.branding_name = brandingName
      updates.branding_display_name = brandingName
    }
    if (brandingHideBadge !== undefined) {
      updates.branding_hide_badge = brandingHideBadge
    }
    if (newSlug && newSlug !== oldSlug) {
      updates.booking_slug_prefix = newSlug
    }

    const { error: updateError } = await supabaseClient
      .from('companies')
      .update(updates)
      .eq('id', profile.company_id)

    if (updateError) {
      console.error('Company update error:', updateError)
      return new Response(
        JSON.stringify({ error: updateError.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    console.log('Branding updated:', {
      companyId: profile.company_id,
      brandingName,
      oldSlug,
      newSlug
    })

    return new Response(
      JSON.stringify({
        success: true,
        booking_slug_prefix: newSlug,
        old_slug: oldSlug,
        slug_changed: newSlug !== oldSlug
      }),
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
