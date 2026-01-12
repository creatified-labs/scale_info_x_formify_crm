import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface UpdateBookingPayload {
  booking_id: string;
  invitee_name?: string;
  invitee_email?: string;
  invitee_phone?: string | null;
  chosen_call_type?: string | null;
  start_time?: string;
  end_time?: string;
  status?: string;
  notes?: string | null;
  video_join_url?: string | null;
  send_email?: boolean;
  user_id?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const payload = (await req.json()) as UpdateBookingPayload;
    const {
      booking_id,
      invitee_name,
      invitee_email,
      invitee_phone,
      chosen_call_type,
      start_time,
      end_time,
      status,
      notes,
      video_join_url,
      send_email,
      user_id,
    } = payload;

    if (!booking_id) {
      return new Response(JSON.stringify({ error: "booking_id is required" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Ensure booking exists and belongs to user/company
    // Fetch with calendar_event_id and related data for potential Google Calendar update
    const { data: existingBooking, error: fetchError } = await supabaseClient
      .from("bookings")
      .select(`
        id,
        host_user_id,
        company_id,
        invitee_email,
        invitee_name,
        start_time,
        end_time,
        calendar_event_id,
        event_type_id,
        event_types (
          id,
          name,
          description,
          user_id,
          availability_schedule_id,
          companies (
            id,
            branding_name,
            branding_display_name,
            primary_contact_email,
            settings
          )
        )
      `)
      .eq("id", booking_id)
      .single();

    if (fetchError || !existingBooking) {
      return new Response(JSON.stringify({ error: "Booking not found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 404,
      });
    }

    if (user_id && existingBooking.host_user_id !== user_id) {
      return new Response(JSON.stringify({ error: "Unauthorized to update booking" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 403,
      });
    }

    const updatePayload: Record<string, unknown> = {};
    if (invitee_name !== undefined) updatePayload.invitee_name = invitee_name;
    if (invitee_email !== undefined) updatePayload.invitee_email = invitee_email.toLowerCase();
    if (invitee_phone !== undefined) updatePayload.invitee_phone = invitee_phone;
    if (chosen_call_type !== undefined) updatePayload.chosen_call_type = chosen_call_type;
    if (start_time !== undefined) updatePayload.start_time = start_time;
    if (end_time !== undefined) updatePayload.end_time = end_time;
    if (status !== undefined) updatePayload.status = status;
    if (notes !== undefined) updatePayload.notes = notes;
    if (video_join_url !== undefined) updatePayload.video_join_url = video_join_url;

    if (!Object.keys(updatePayload).length) {
      return new Response(JSON.stringify({ error: "No fields provided to update" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const { data: updatedBooking, error: updateError } = await supabaseClient
      .from("bookings")
      .update(updatePayload)
      .eq("id", booking_id)
      .select()
      .single();

    if (updateError || !updatedBooking) {
      console.error("Booking update error:", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to update booking", details: updateError?.message }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    // Update Google Calendar event if time changed and calendar_event_id exists
    let calendarUpdateError = null;
    const timeChanged = (start_time && start_time !== (existingBooking as any).start_time) ||
                       (end_time && end_time !== (existingBooking as any).end_time);

    if (timeChanged && (existingBooking as any).calendar_event_id) {
      try {
        console.log('Time changed, updating Google Calendar event...');
        const eventType = (existingBooking as any).event_types;

        if (eventType?.user_id) {
          // Get Google Calendar integration
          const { data: integration } = await supabaseClient
            .from('user_integrations')
            .select('access_token, refresh_token, expires_at, email')
            .eq('user_id', eventType.user_id)
            .eq('provider', 'google')
            .single();

          if (integration) {
            let accessToken = integration.access_token;
            const targetCalendar = integration.email || 'primary';

            // Check if token needs refresh
            const expiresAt = integration.expires_at ? new Date(integration.expires_at) : null;
            if (expiresAt && expiresAt.getTime() <= Date.now() + 300000) {
              console.log('Access token expired, refreshing...');
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
                });

                if (refreshResponse.ok) {
                  const refreshData = await refreshResponse.json() as { access_token: string; expires_in: number };
                  accessToken = refreshData.access_token;
                  const newExpiresAt = new Date(Date.now() + refreshData.expires_in * 1000);

                  await supabaseClient
                    .from('user_integrations')
                    .update({
                      access_token: accessToken,
                      expires_at: newExpiresAt.toISOString(),
                    })
                    .eq('user_id', eventType.user_id)
                    .eq('provider', 'google');

                  console.log('Token refreshed successfully');
                }
              } catch (refreshErr) {
                console.error('Token refresh error:', refreshErr);
              }
            }

            // Get schedule timezone
            let scheduleTimezone = 'UTC';
            if (eventType.availability_schedule_id) {
              const { data: schedule } = await supabaseClient
                .from('availability_schedules')
                .select('timezone')
                .eq('id', eventType.availability_schedule_id)
                .single();
              scheduleTimezone = schedule?.timezone || 'UTC';
            }

            // Update the Google Calendar event
            const brandName = eventType.companies?.branding_display_name || eventType.companies?.branding_name || 'Scale Info';
            const organizerEmail = integration.email || eventType.companies?.primary_contact_email || targetCalendar;

            const eventData: any = {
              summary: `${eventType.name || 'Booking'} with ${brandName}`,
              description: eventType.description || `Meeting with ${updatedBooking.invitee_name}`,
              start: {
                dateTime: updatedBooking.start_time,
                timeZone: scheduleTimezone,
              },
              end: {
                dateTime: updatedBooking.end_time,
                timeZone: scheduleTimezone,
              },
              organizer: {
                email: organizerEmail,
                displayName: brandName,
              },
              attendees: [
                { email: updatedBooking.invitee_email, displayName: updatedBooking.invitee_name },
              ],
            };

            console.log(`Updating calendar event ${(existingBooking as any).calendar_event_id} on calendar: ${targetCalendar}`);

            const calendarResponse = await fetch(
              `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(targetCalendar)}/events/${(existingBooking as any).calendar_event_id}?sendUpdates=all`,
              {
                method: 'PATCH',
                headers: {
                  'Authorization': `Bearer ${accessToken}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(eventData),
              }
            );

            if (calendarResponse.ok) {
              console.log('Google Calendar event updated successfully');
            } else {
              const errorText = await calendarResponse.text();
              console.error('Failed to update Google Calendar event:', errorText);
              calendarUpdateError = 'Failed to update Google Calendar event';
            }
          }
        }
      } catch (error) {
        console.error('Error updating Google Calendar event:', error);
        calendarUpdateError = error instanceof Error ? error.message : 'Unknown error';
      }
    }

    if (send_email) {
      fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-booking-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
        },
        body: JSON.stringify({
          booking_id,
          template_type: "booking_update",
          recipient: updatedBooking.invitee_email ?? existingBooking.invitee_email,
        }),
      }).catch((err) => console.error("Booking update email error:", err));
    }

    return new Response(
      JSON.stringify({
        success: true,
        booking: updatedBooking,
        calendar_update_error: calendarUpdateError,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("update-booking error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
