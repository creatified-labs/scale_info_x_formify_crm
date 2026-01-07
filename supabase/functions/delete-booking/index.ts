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

    const { booking_id, send_email = false } = await req.json()

    if (!booking_id) {
      return new Response(
        JSON.stringify({ error: 'booking_id is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    console.log('Deleting booking:', booking_id, 'send_email:', send_email)

    // Fetch booking details
    const { data: booking, error: fetchError } = await supabaseClient
      .from('bookings')
      .select('*, event_types(*)')
      .eq('id', booking_id)
      .single()

    if (fetchError || !booking) {
      console.error('Error fetching booking:', fetchError)
      return new Response(
        JSON.stringify({ error: 'Booking not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      )
    }

    console.log('Booking found:', booking.invitee_email)

    // Delete from Google Calendar if calendar_event_id exists
    if (booking.calendar_event_id) {
      console.log('Deleting from Google Calendar:', booking.calendar_event_id)
      
      const { data: integration } = await supabaseClient
        .from('user_integrations')
        .select('access_token, refresh_token, expires_at')
        .eq('user_id', booking.host_user_id)
        .eq('provider', 'google')
        .maybeSingle()

      if (integration?.access_token) {
        let accessToken = integration.access_token
        const expiresAt = integration.expires_at ? new Date(integration.expires_at) : null
        const now = new Date()

        // Refresh token if expired
        if (expiresAt && expiresAt <= now && integration.refresh_token) {
          console.log('Refreshing expired token...')
          try {
            const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
              method: 'POST',
              headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
              body: new URLSearchParams({
                client_id: Deno.env.get('GOOGLE_CLIENT_ID') ?? '',
                client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET') ?? '',
                refresh_token: integration.refresh_token,
                grant_type: 'refresh_token',
              }),
            })

            if (refreshResponse.ok) {
              const refreshData = await refreshResponse.json()
              accessToken = refreshData.access_token
              const newExpiresAt = new Date(Date.now() + refreshData.expires_in * 1000)

              await supabaseClient
                .from('user_integrations')
                .update({
                  access_token: accessToken,
                  expires_at: newExpiresAt.toISOString(),
                })
                .eq('user_id', booking.host_user_id)
                .eq('provider', 'google')

              console.log('Token refreshed successfully')
            }
          } catch (refreshErr) {
            console.error('Token refresh failed:', refreshErr)
          }
        }

        // Delete the calendar event
        try {
          const deleteResponse = await fetch(
            `https://www.googleapis.com/calendar/v3/calendars/primary/events/${booking.calendar_event_id}`,
            {
              method: 'DELETE',
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
              },
            }
          )

          if (deleteResponse.ok || deleteResponse.status === 404) {
            console.log('Calendar event deleted successfully')
          } else {
            console.error('Failed to delete calendar event:', await deleteResponse.text())
          }
        } catch (calErr) {
          console.error('Error deleting calendar event:', calErr)
        }
      }
    }

    // Send cancellation email to invitee (only if requested)
    if (send_email) {
      console.log('Sending cancellation email to:', booking.invitee_email)
      try {
        const emailResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-email`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
            'apikey': Deno.env.get('SUPABASE_ANON_KEY') ?? '',
          },
          body: JSON.stringify({
            to: booking.invitee_email,
            subject: `Booking Cancelled: ${booking.event_types?.name || 'Your Meeting'}`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #dc2626;">Booking Cancelled</h2>
                <p>Hello ${booking.invitee_name},</p>
                <p>Your booking has been cancelled:</p>
                <div style="background-color: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
                  <p style="margin: 8px 0;"><strong>Event:</strong> ${booking.event_types?.name || 'Meeting'}</p>
                  <p style="margin: 8px 0;"><strong>Date:</strong> ${new Date(booking.start_time).toLocaleDateString()}</p>
                  <p style="margin: 8px 0;"><strong>Time:</strong> ${new Date(booking.start_time).toLocaleTimeString()}</p>
                </div>
                <p>If you have any questions, please contact us.</p>
                <p>Best regards</p>
              </div>
            `,
          }),
        })

        if (!emailResponse.ok) {
          console.error('Failed to send cancellation email:', await emailResponse.text())
        } else {
          console.log('Cancellation email sent successfully')
        }
      } catch (emailErr) {
        console.error('Error sending cancellation email:', emailErr)
      }
    } else {
      console.log('Skipping cancellation email (send_email=false)')
    }

    // Delete the booking from database
    const { error: deleteError } = await supabaseClient
      .from('bookings')
      .delete()
      .eq('id', booking_id)

    if (deleteError) {
      console.error('Error deleting booking:', deleteError)
      return new Response(
        JSON.stringify({ error: 'Failed to delete booking', details: deleteError.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    console.log('Booking deleted successfully')

    return new Response(
      JSON.stringify({ success: true, message: 'Booking deleted, calendar updated, and cancellation email sent' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error: any) {
    console.error('Error in delete-booking function:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
