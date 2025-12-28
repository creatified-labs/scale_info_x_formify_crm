import { supabase } from "@/integrations/supabase/client";

export interface MetricsOverview {
  callsBooked: number;
  completed: number;
  noShow: number;
  cancelled: number;
  converted: number;
  revenue: number;
  currency: string;
}

export interface DailyMetrics {
  date: string;
  booked: number;
  completed: number;
  noShow: number;
  cancelled: number;
  converted: number;
  revenue: number;
}

/**
 * Get overview metrics for a date range
 */
export async function getOverview(options?: { from?: string; to?: string }): Promise<MetricsOverview> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Try to get from tenant_totals first (faster)
  const { data: totals } = await supabase
    .from('tenant_totals')
    .select('*')
    .eq('tenant_id', user.id)
    .maybeSingle();

  if (totals && !options?.from && !options?.to) {
    // Return cached totals if no date filter
    return {
      callsBooked: totals.calls_booked_total || 0,
      completed: totals.completed_total || 0,
      noShow: totals.no_show_total || 0,
      cancelled: totals.cancelled_total || 0,
      converted: totals.converted_total || 0,
      revenue: Number(totals.revenue_total) || 0,
      currency: totals.revenue_currency || 'GBP',
    };
  }

  // Otherwise calculate from calls table with date filters
  let query = supabase
    .from('calls')
    .select('status, conversion_amount')
    .eq('tenant_id', user.id);

  if (options?.from) {
    query = query.gte('start_utc', `${options.from}T00:00:00Z`);
  }
  if (options?.to) {
    query = query.lte('start_utc', `${options.to}T23:59:59Z`);
  }

  const { data: calls, error } = await query;
  
  if (error) throw error;

  const metrics = (calls || []).reduce((acc, call) => {
    acc.callsBooked++;
    if (call.status === 'completed') acc.completed++;
    if (call.status === 'no-show') acc.noShow++;
    if (call.status === 'cancelled') acc.cancelled++;
    if (Number(call.conversion_amount) > 0) {
      acc.converted++;
      acc.revenue += Number(call.conversion_amount);
    }
    return acc;
  }, {
    callsBooked: 0,
    completed: 0,
    noShow: 0,
    cancelled: 0,
    converted: 0,
    revenue: 0,
    currency: 'GBP',
  });

  return metrics;
}

/**
 * Get daily time series for a date range
 */
export async function getDailySeries(options: { from: string; to: string }): Promise<DailyMetrics[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Try tenant_daily_call_stats first
  const { data: dailyStats, error: statsError } = await supabase
    .from('tenant_daily_call_stats')
    .select('*')
    .eq('tenant_id', user.id)
    .gte('date', options.from)
    .lte('date', options.to)
    .order('date', { ascending: true });

  if (!statsError && dailyStats && dailyStats.length > 0) {
    return dailyStats.map(stat => ({
      date: stat.date,
      booked: stat.booked || 0,
      completed: stat.completed || 0,
      noShow: stat.no_show || 0,
      cancelled: stat.cancelled || 0,
      converted: stat.converted || 0,
      revenue: Number(stat.revenue_amount) || 0,
    }));
  }

  // Fallback: aggregate from calls table
  const { data: calls, error } = await supabase
    .from('calls')
    .select('start_utc, status, conversion_amount')
    .eq('tenant_id', user.id)
    .gte('start_utc', `${options.from}T00:00:00Z`)
    .lte('start_utc', `${options.to}T23:59:59Z`)
    .order('start_utc', { ascending: true });

  if (error) throw error;

  // Group by date
  const dailyMap = new Map<string, DailyMetrics>();
  
  (calls || []).forEach(call => {
    const date = call.start_utc.split('T')[0];
    const existing = dailyMap.get(date) || {
      date,
      booked: 0,
      completed: 0,
      noShow: 0,
      cancelled: 0,
      converted: 0,
      revenue: 0,
    };

    existing.booked++;
    if (call.status === 'completed') existing.completed++;
    if (call.status === 'no-show') existing.noShow++;
    if (call.status === 'cancelled') existing.cancelled++;
    if (Number(call.conversion_amount) > 0) {
      existing.converted++;
      existing.revenue += Number(call.conversion_amount);
    }

    dailyMap.set(date, existing);
  });

  return Array.from(dailyMap.values()).sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Subscribe to realtime metrics updates
 */
export function subscribeToMetrics(tenantId: string, callback: () => void) {
  const channel = supabase
    .channel(`tenant:${tenantId}:metrics`)
    .on('broadcast', { event: 'metrics_updated' }, callback)
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
