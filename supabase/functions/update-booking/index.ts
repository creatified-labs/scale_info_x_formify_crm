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
    const { data: existingBooking, error: fetchError } = await supabaseClient
      .from("bookings")
      .select("id, host_user_id, company_id, invitee_email, invitee_name")
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

    return new Response(JSON.stringify({ success: true, booking: updatedBooking }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("update-booking error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
