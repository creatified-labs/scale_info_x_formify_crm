"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface TenantMetrics {
  calls_booked_total: number;
  completed_total: number;
  no_show_total: number;
  cancelled_total: number;
  converted_total: number;
  revenue_total: number;
  revenue_currency: string;
  updated_at: string;
}

export interface DailyStats {
  date: string;
  booked: number;
  completed: number;
  no_show: number;
  cancelled: number;
  converted: number;
  revenue_amount: number;
}

export function useRealtimeMetrics(tenantId: string | undefined) {
  const [metrics, setMetrics] = useState<TenantMetrics | null>(null);
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch initial data
  useEffect(() => {
    const fetchMetrics = async () => {
      if (!tenantId) return;

      setLoading(true);

      // Fetch tenant totals
      const { data: totals, error: totalsError } = await supabase
        .from('tenant_totals')
        .select('*')
        .eq('tenant_id', tenantId)
        .maybeSingle();

      if (totalsError) {
        console.warn('useRealtimeMetrics: tenant_totals fetch error', totalsError);
      }

      if (totals) {
        setMetrics(totals as TenantMetrics);
      } else {
        setMetrics((prev) => ({
          ...prev,
          tenant_id: tenantId,
        } as TenantMetrics));
      }

      // Fetch recent daily stats (last 90 days)
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

      const { data: stats } = await supabase
        .from('tenant_daily_call_stats')
        .select('*')
        .eq('tenant_id', tenantId)
        .gte('date', ninetyDaysAgo.toISOString().split('T')[0])
        .order('date', { ascending: true });

      if (stats) {
        setDailyStats(stats as DailyStats[]);
      }

      setLoading(false);
    };

    fetchMetrics();
  }, [tenantId]);

  // Subscribe to realtime updates
  useEffect(() => {
    if (!tenantId) return;

    let totalsChannel: RealtimeChannel;
    let statsChannel: RealtimeChannel;

    const setupRealtimeSubscriptions = () => {
      // Subscribe to tenant_totals updates
      totalsChannel = supabase
        .channel(`tenant_totals:${tenantId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'tenant_totals',
            filter: `tenant_id=eq.${tenantId}`,
          },
          (payload) => {
            console.log('[useRealtimeMetrics] Tenant totals updated:', payload);
            if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
              setMetrics(payload.new as TenantMetrics);
            }
          }
        )
        .subscribe();

      // Subscribe to daily stats updates
      statsChannel = supabase
        .channel(`daily_stats:${tenantId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'tenant_daily_call_stats',
            filter: `tenant_id=eq.${tenantId}`,
          },
          (payload) => {
            console.log('[useRealtimeMetrics] Daily stats updated:', payload);
            
            if (payload.eventType === 'INSERT') {
              setDailyStats((prev) => [...prev, payload.new as DailyStats].sort((a, b) => a.date.localeCompare(b.date)));
            } else if (payload.eventType === 'UPDATE') {
              setDailyStats((prev) =>
                prev.map((stat) => (stat.date === (payload.new as DailyStats).date ? (payload.new as DailyStats) : stat))
              );
            } else if (payload.eventType === 'DELETE') {
              setDailyStats((prev) => prev.filter((stat) => stat.date !== (payload.old as DailyStats).date));
            }
          }
        )
        .subscribe();
    };

    setupRealtimeSubscriptions();

    return () => {
      if (totalsChannel) supabase.removeChannel(totalsChannel);
      if (statsChannel) supabase.removeChannel(statsChannel);
    };
  }, [tenantId]);

  return { metrics, dailyStats, loading };
}
