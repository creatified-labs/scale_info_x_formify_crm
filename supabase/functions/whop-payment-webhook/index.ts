import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-whop-signature',
}

interface WhopWebhookPayload {
  action: string // e.g., 'payment.succeeded', 'membership.went_valid', etc.
  data: {
    id: string
    user: {
      id: string
      email: string
      username?: string
      name?: string
    }
    plan: {
      id: string
      name: string
    }
    amount?: number
    price?: number
    currency?: string
    status?: string
    metadata?: {
      booking_id?: string
      event_type_id?: string
      company_id?: string
      invitee_email?: string
    }
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Verify webhook signature
    const whopWebhookSecret = Deno.env.get('WHOP_WEBHOOK_SECRET')
    if (!whopWebhookSecret) {
      console.error('WHOP_WEBHOOK_SECRET not configured')
      return new Response(
        JSON.stringify({ error: 'Webhook secret not configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    // Get raw body for processing
    const body = await req.text()
    
    // Log all headers for debugging
    const headers: Record<string, string> = {}
    req.headers.forEach((value, key) => {
      headers[key] = value
    })
    console.log('Webhook headers:', headers)
    
    const signature = req.headers.get('x-whop-signature')
    
    // Verify signature if present (optional for now to debug)
    if (signature && whopWebhookSecret) {
      console.log('Verifying webhook signature...')
      
      const encoder = new TextEncoder()
      const key = await crypto.subtle.importKey(
        'raw',
        encoder.encode(whopWebhookSecret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      )
      
      const signatureBuffer = await crypto.subtle.sign(
        'HMAC',
        key,
        encoder.encode(body)
      )
      
      const expectedSignature = Array.from(new Uint8Array(signatureBuffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')
      
      if (signature !== expectedSignature) {
        console.error('Invalid webhook signature', { received: signature, expected: expectedSignature })
        return new Response(
          JSON.stringify({ error: 'Invalid signature' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
        )
      }
      
      console.log('Webhook signature verified')
    } else {
      console.warn('Webhook signature verification skipped - signature or secret not present')
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    const payload = JSON.parse(body) as any
    console.log('Whop webhook received:', { type: payload.type, action: payload.action })
    console.log('Full payload data:', JSON.stringify(payload.data, null, 2))

    // Process payment and membership events
    const eventType = payload.type || payload.action
    const supportedEvents = ['payment.succeeded', 'membership.activated', 'invoice.paid']
    
    if (!supportedEvents.includes(eventType)) {
      console.log('Ignoring event:', eventType)
      return new Response(
        JSON.stringify({ message: 'Event ignored' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    const { data } = payload
    
    // Try to extract booking ID from invoice description, notes, or metadata
    // Format: "Booking: <booking-id>" or just the booking UUID
    let bookingId: string | null = null
    
    const descriptionText = data.description || data.notes || data.memo || ''
    const bookingMatch = descriptionText.match(/booking[:\s-]+([a-f0-9-]{36})/i) || 
                        descriptionText.match(/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i)
    
    if (bookingMatch) {
      bookingId = bookingMatch[1]
      console.log('Found booking ID in description:', bookingId)
    } else if (data.metadata?.booking_id) {
      bookingId = data.metadata.booking_id
      console.log('Found booking ID in metadata:', bookingId)
    }
    
    // Priority order for finding the booking email (fallback if no booking ID):
    // 1. email_address (invoice recipient - who the invoice was sent to)
    // 2. metadata.invitee_email (explicitly set)
    // 3. member.email (for membership events)
    // 4. Fetch from Whop API if invoice.paid event
    // 5. user.email (who paid the invoice - fallback)
    let customerEmail = data.email_address || 
                       data.metadata?.invitee_email || 
                       data.member?.email ||
                       null
    
    // If no email found and this is an invoice event, try to fetch invoice details from Whop API
    if (!customerEmail && eventType === 'invoice.paid' && data.id) {
      console.log('Fetching invoice details from Whop API:', data.id)
      const whopApiKey = Deno.env.get('WHOP_API_KEY')
      
      if (whopApiKey) {
        try {
          const invoiceResponse = await fetch(`https://api.whop.com/api/v5/invoices/${data.id}`, {
            headers: {
              'Authorization': `Bearer ${whopApiKey}`,
              'Content-Type': 'application/json',
            },
          })
          
          if (invoiceResponse.ok) {
            const invoiceData = await invoiceResponse.json() as any
            console.log('Invoice data from API:', JSON.stringify(invoiceData, null, 2))
            
            // Try to extract email from invoice data
            customerEmail = invoiceData.email_address || 
                          invoiceData.email || 
                          invoiceData.customer?.email ||
                          invoiceData.billing_address?.email
            
            console.log('Extracted email from Whop API:', customerEmail)
          } else {
            console.error('Failed to fetch invoice from Whop API:', invoiceResponse.status)
          }
        } catch (apiError) {
          console.error('Error fetching invoice from Whop API:', apiError)
        }
      }
    }
    
    // Final fallback to user email
    if (!customerEmail) {
      customerEmail = data.user?.email
    }
    
    if (!customerEmail) {
      console.error('No email found in webhook payload or Whop API', {
        has_email_address: !!data.email_address,
        has_metadata_email: !!data.metadata?.invitee_email,
        has_member_email: !!data.member?.email,
        has_user_email: !!data.user?.email,
      })
      return new Response(
        JSON.stringify({ error: 'No email found in webhook payload' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }
    
    // For membership.activated, there might not be an explicit amount
    // Try to get it from various possible fields
    const amount = data.amount || data.price || 0
    const currency = data.currency || 'usd'
    
    console.log('Processing Whop event:', {
      eventType,
      id: data.id,
      booking_id: bookingId,
      email_address: data.email_address,
      user_email: data.user?.email,
      metadata_email: data.metadata?.invitee_email,
      selected_email: customerEmail,
      amount,
      currency,
      status: data.status,
    })

    // Find booking - prioritize booking ID if available
    let booking = null
    let bookingError = null
    
    if (bookingId) {
      // Direct lookup by booking ID
      console.log('Looking up booking by ID:', bookingId)
      const { data: directBooking, error: directError } = await supabaseAdmin
        .from('bookings')
        .select('id, event_type_id, host_user_id, invitee_name, invitee_email, start_time, status, is_converted')
        .eq('id', bookingId)
        .maybeSingle()
      
      if (directError) {
        console.error('Error finding booking by ID:', directError)
        bookingError = directError
      } else if (directBooking) {
        booking = directBooking
        console.log('Found booking by ID:', booking.id)
      } else {
        console.log('No booking found with ID:', bookingId)
      }
    }
    
    // Fallback to email lookup if no booking ID or booking not found
    if (!booking && customerEmail) {
      console.log('Looking up booking by email:', customerEmail)
      const { data: bookings, error: emailError } = await supabaseAdmin
        .from('bookings')
        .select('id, event_type_id, host_user_id, invitee_name, invitee_email, start_time, status, is_converted')
        .eq('invitee_email', customerEmail)
        .order('created_at', { ascending: false })

      if (emailError) {
        console.error('Error finding booking by email:', emailError)
        bookingError = emailError
      } else if (bookings && bookings.length > 0) {
        // Use the most recent booking that hasn't been converted yet
        booking = bookings.find(b => !b.is_converted) || bookings[0]
        console.log('Found booking by email:', booking.id)
      }
    }

    if (bookingError) {
      throw new Error(`Failed to find booking: ${bookingError.message}`)
    }

    if (!booking) {
      console.log('No booking found for ID or email:', { bookingId, customerEmail })
      return new Response(
        JSON.stringify({ message: 'No booking found for this invoice' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    // Get company_id from host user
    const { data: hostUser } = await supabaseAdmin
      .from('users')
      .select('company_id')
      .eq('id', booking.host_user_id)
      .single()

    const companyId = hostUser?.company_id || data.metadata?.company_id

    if (!companyId) {
      console.error('No company_id found for booking:', booking.id)
      throw new Error('Company ID not found')
    }

    // Update booking to completed and mark as converted
    const { error: updateError } = await supabaseAdmin
      .from('bookings')
      .update({
        status: 'completed',
        is_converted: true,
        conversion_amount: amount,
        converted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', booking.id)

    if (updateError) {
      console.error('Error updating booking:', updateError)
      throw new Error(`Failed to update booking: ${updateError.message}`)
    }

    console.log('Booking updated to completed:', booking.id)

    // Get event type details for revenue entry
    const { data: eventTypeData } = await supabaseAdmin
      .from('event_types')
      .select('name')
      .eq('id', booking.event_type_id)
      .single()

    // Create revenue entry with standardized ID format (matches convert-booking)
    const revenueEntryId = `booking-conversion-${booking.id}`

    // Check if revenue entry already exists from manual conversion
    const { data: existingEntry } = await supabaseAdmin
      .from('revenue_entries')
      .select('id')
      .eq('id', revenueEntryId)
      .maybeSingle()

    if (existingEntry) {
      console.log(`Revenue entry already exists for booking ${booking.id}, skipping creation`)
      return new Response(
        JSON.stringify({
          success: true,
          booking_id: booking.id,
          revenue_entry_id: revenueEntryId,
          message: 'Revenue entry already exists',
          amount: amount,
          currency: currency,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    }

    const { error: revenueError } = await supabaseAdmin
      .from('revenue_entries')
      .upsert({
        id: revenueEntryId,
        company_id: companyId,
        entry_date: new Date(booking.start_time).toISOString().split('T')[0],
        amount: amount,
        currency: currency,
        description: `Payment for ${eventTypeData?.name || 'booking'} - ${booking.invitee_name}`,
        category: 'booking_payment',
        category_name: 'Booking Payment',
        event_type_id: booking.event_type_id,
        event_type_name: eventTypeData?.name,
        metadata: {
          booking_id: booking.id,
          whop_payment_id: data.id,
          whop_user_id: data.user.id,
          customer_email: customerEmail,
          customer_name: data.user.name || booking.invitee_name,
          plan_name: data.plan?.name,
          source: 'whop_webhook',
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'id'
      })

    if (revenueError) {
      console.error('Error creating revenue entry:', revenueError)
      // Don't throw - booking is already updated
      console.log('Booking updated but revenue entry failed')
    } else {
      console.log('Revenue entry created:', revenueEntryId)
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        booking_id: booking.id,
        revenue_entry_id: revenueEntryId,
        amount: amount,
        currency: currency,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Whop webhook error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})
