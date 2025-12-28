"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface UnifiedCall {
  id: string;
  tenant_id: string;
  event_type_id?: string;
  source: 'booking' | 'manual' | 'tracker';
  start_utc: string;
  end_utc: string;
  status: 'scheduled' | 'completed' | 'no_show' | 'cancelled';
  converted: boolean;
  conversion_amount: number;
  conversion_currency: string;
  converted_at?: string;
  assignee_user_id?: string;
  channel?: string;
  utm?: any;
  client_name: string;
  client_email?: string;
  client_phone?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export function useRealtimeCalls(tenantId: string | undefined) {
  const [calls, setCalls] = useState<UnifiedCall[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch initial calls
  useEffect(() => {
    const fetchCalls = async () => {
      if (!tenantId) return;

      setLoading(true);

      const { data, error } = await supabase
        .from('calls')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('start_utc', { ascending: false });

      if (error) {
        console.error('[useRealtimeCalls] Error fetching calls:', error);
      } else if (data) {
        setCalls(data as UnifiedCall[]);
      }

      setLoading(false);
    };

    fetchCalls();
  }, [tenantId]);

  // Subscribe to realtime updates
  useEffect(() => {
    if (!tenantId) return;

    const channel: RealtimeChannel = supabase
      .channel(`calls:${tenantId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'calls',
          filter: `tenant_id=eq.${tenantId}`,
        },
        (payload) => {
          console.log('[useRealtimeCalls] Call updated:', payload);

          if (payload.eventType === 'INSERT') {
            setCalls((prev) => [payload.new as UnifiedCall, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setCalls((prev) =>
              prev.map((call) => (call.id === (payload.new as UnifiedCall).id ? (payload.new as UnifiedCall) : call))
            );
          } else if (payload.eventType === 'DELETE') {
            setCalls((prev) => prev.filter((call) => call.id !== (payload.old as UnifiedCall).id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenantId]);

  return { calls, loading };
}
