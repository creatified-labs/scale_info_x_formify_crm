import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { action, company_id, user_id, entry } = await req.json();

    console.log('[manage-revenue] Action:', action, 'Company:', company_id, 'User:', user_id);

    // Verify user belongs to company
    if (user_id && company_id) {
      const { data: userData } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', user_id)
        .single();

      if (!userData || userData.company_id !== company_id) {
        return new Response(
          JSON.stringify({ error: 'Unauthorized' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    switch (action) {
      case 'update': {
        if (!entry || !entry.id) {
          return new Response(
            JSON.stringify({ error: 'Entry ID required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Check if this is a booking-derived entry (needs upsert)
        if (entry.id.startsWith('booking-')) {
          const insertPayload = {
            id: entry.id,
            company_id,
            entry_date: entry.date,
            amount: entry.amount,
            description: entry.description ?? null,
            metadata: entry.metadata ? { ...entry.metadata, originalBookingId: entry.id } : { originalBookingId: entry.id },
            event_type_id: entry.eventTypeId ?? null,
            event_type_name: entry.eventTypeName ?? null,
          };

          const { data, error } = await supabase
            .from('revenue_entries')
            .upsert(insertPayload, { onConflict: 'id' })
            .select()
            .single();

          if (error) {
            console.error('[manage-revenue] Upsert error:', error);
            return new Response(
              JSON.stringify({ error: error.message }),
              { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }

          return new Response(
            JSON.stringify({ entry: data }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Regular update
        const updatePayload = {
          entry_date: entry.date,
          amount: entry.amount,
          description: entry.description ?? null,
          metadata: entry.metadata ?? null,
          event_type_id: entry.eventTypeId ?? null,
          event_type_name: entry.eventTypeName ?? null,
        };

        const { data, error } = await supabase
          .from('revenue_entries')
          .update(updatePayload)
          .eq('id', entry.id)
          .eq('company_id', company_id)
          .select()
          .single();

        if (error) {
          console.error('[manage-revenue] Update error:', error);
          return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({ entry: data }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'delete': {
        const { entry_id } = await req.json();
        
        if (!entry_id) {
          return new Response(
            JSON.stringify({ error: 'Entry ID required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { error } = await supabase
          .from('revenue_entries')
          .delete()
          .eq('id', entry_id)
          .eq('company_id', company_id);

        if (error) {
          console.error('[manage-revenue] Delete error:', error);
          return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (error) {
    console.error('[manage-revenue] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
