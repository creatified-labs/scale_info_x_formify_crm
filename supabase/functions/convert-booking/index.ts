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
      .select('*, event_types(name)')
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

      // Create or remove revenue entry
      if (is_converted && conversion_amount !== undefined && conversion_amount > 0) {
        // Create a revenue entry for this conversion
        const entryDate = data.start_time ? data.start_time.split('T')[0] : new Date().toISOString().split('T')[0]
        const eventTypeName = (data as any).event_types?.name || 'Booking'
        const inviteeName = data.invitee_name || 'Unknown'

        const { error: revenueError } = await supabaseClient
          .from('revenue_entries')
          .upsert({
            id: `booking-conversion-${booking_id}`,
            company_id: data.company_id,
            entry_date: entryDate,
            amount: conversion_amount,
            currency: 'GBP',
            description: `${eventTypeName}: ${inviteeName}`,
            category: eventTypeName.toLowerCase().replace(/\s+/g, '_'),
            category_name: eventTypeName,
            event_type_id: data.event_type_id,
            event_type_name: eventTypeName,
            booking_id: booking_id,
            metadata: {
              source: 'booking_conversion',
              booking_id: booking_id,
              event_type_id: data.event_type_id
            }
          }, {
            onConflict: 'id'
          })

        if (revenueError) {
          console.error('Error creating revenue entry:', revenueError)
          // Don't fail the request, just log the error
        } else {
          console.log('Revenue entry created successfully')
        }
      } else if (!is_converted) {
        // Remove revenue entry when conversion is undone
        const { error: deleteError } = await supabaseClient
          .from('revenue_entries')
          .delete()
          .eq('id', `booking-conversion-${booking_id}`)

        if (deleteError) {
          console.error('Error deleting revenue entry:', deleteError)
        } else {
          console.log('Revenue entry deleted successfully')
        }
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
