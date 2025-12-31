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

    const { booking_id, email } = await req.json()

    if (!booking_id && !email) {
      return new Response(
        JSON.stringify({ error: 'Either booking_id or email is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    let inviteeEmail = email

    // If booking_id provided, get the email from booking
    if (booking_id && !email) {
      const { data: booking } = await supabaseClient
        .from('bookings')
        .select('invitee_email')
        .eq('id', booking_id)
        .single()

      if (!booking) {
        return new Response(
          JSON.stringify({ error: 'Booking not found' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
        )
      }

      inviteeEmail = booking.invitee_email
    }

    const whopApiKey = Deno.env.get('WHOP_API_KEY')
    if (!whopApiKey) {
      console.warn('WHOP_API_KEY not configured')
      return new Response(
        JSON.stringify({ 
          has_payment: false, 
          message: 'Whop API not configured' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    // Search for user by email in Whop
    const userSearchResponse = await fetch(
      `https://api.whop.com/api/v5/users?email=${encodeURIComponent(inviteeEmail)}`,
      {
        headers: {
          'Authorization': `Bearer ${whopApiKey}`,
          'Content-Type': 'application/json',
        },
      }
    )

    if (!userSearchResponse.ok) {
      console.error('Failed to search Whop users:', userSearchResponse.statusText)
      return new Response(
        JSON.stringify({ 
          has_payment: false, 
          message: 'User not found in Whop' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    const userData = await userSearchResponse.json()
    const users = userData.data || []

    if (users.length === 0) {
      return new Response(
        JSON.stringify({ 
          has_payment: false, 
          message: 'No Whop user found with this email',
          email: inviteeEmail 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    const whopUser = users[0]
    const whopUserId = whopUser.id

    // Get user's payments/memberships
    const paymentsResponse = await fetch(
      `https://api.whop.com/api/v5/memberships?user_id=${whopUserId}`,
      {
        headers: {
          'Authorization': `Bearer ${whopApiKey}`,
          'Content-Type': 'application/json',
        },
      }
    )

    if (!paymentsResponse.ok) {
      console.error('Failed to fetch Whop payments:', paymentsResponse.statusText)
      return new Response(
        JSON.stringify({ 
          has_payment: false, 
          message: 'Failed to fetch payment data' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    const paymentsData = await paymentsResponse.json()
    const memberships = paymentsData.data || []

    // Check for active or valid memberships
    const activeMemberships = memberships.filter((m: any) => 
      m.status === 'active' || m.status === 'completed' || m.valid === true
    )

    const hasPayment = activeMemberships.length > 0

    // Update booking if booking_id provided
    if (booking_id && hasPayment) {
      await supabaseClient
        .from('bookings')
        .update({
          is_converted: true,
          converted_at: new Date().toISOString(),
        })
        .eq('id', booking_id)
    }

    return new Response(
      JSON.stringify({
        has_payment: hasPayment,
        whop_user_id: whopUserId,
        email: inviteeEmail,
        memberships_count: memberships.length,
        active_memberships_count: activeMemberships.length,
        memberships: activeMemberships.map((m: any) => ({
          id: m.id,
          status: m.status,
          plan_id: m.plan_id,
          valid: m.valid,
          expires_at: m.expires_at,
        })),
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
