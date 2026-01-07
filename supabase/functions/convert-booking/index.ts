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

    const { booking_id, is_converted, conversion_amount } = await req.json()

    if (!booking_id) {
      return new Response(
        JSON.stringify({ error: 'booking_id is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    console.log('Converting booking:', booking_id, 'is_converted:', is_converted, 'amount:', conversion_amount)

    const updateData: any = {
      is_converted,
      converted_at: is_converted ? new Date().toISOString() : null,
    }

    if (is_converted && conversion_amount !== undefined) {
      updateData.conversion_amount = conversion_amount
    } else if (!is_converted) {
      updateData.conversion_amount = null
    }

    const { data, error } = await supabaseClient
      .from('bookings')
      .update(updateData)
      .eq('id', booking_id)
      .select()
      .single()

    if (error) {
      console.error('Error updating booking:', error)
      return new Response(
        JSON.stringify({ error: error.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    console.log('Booking conversion updated successfully')

    // If there's a linked call_log, update it too
    if (data) {
      const { error: callLogError } = await supabaseClient
        .from('call_logs')
        .update({
          is_converted,
          conversion_amount: is_converted && conversion_amount !== undefined ? conversion_amount : null,
        })
        .eq('booking_id', booking_id)

      if (callLogError) {
        console.error('Error updating call_log:', callLogError)
        // Don't fail the request, just log the error
      } else {
        console.log('Call log updated successfully')
      }
    }

    return new Response(
      JSON.stringify({ success: true, booking: data }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error: any) {
    console.error('Error in convert-booking function:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
