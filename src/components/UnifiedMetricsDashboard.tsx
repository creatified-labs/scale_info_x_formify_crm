"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useRealtimeMetrics } from "@/hooks/useRealtimeMetrics";
import { Phone, CheckCircle2, AlertCircle, TrendingUp, DollarSign } from "lucide-react";
import { useMemo, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const UnifiedMetricsDashboard = () => {
  const [userId, setUserId] = useState<string | undefined>();

  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser();
      setUserId(data.user?.id);
    };
    getUser();
  }, []);
  
  const { metrics, dailyStats, loading } = useRealtimeMetrics(userId);

  const showRate = useMemo(() => {
    if (!metrics) return 0;
    const totalAttempted = metrics.completed_total + metrics.no_show_total;
    return totalAttempted > 0 ? (metrics.completed_total / totalAttempted) * 100 : 0;
  }, [metrics]);

  const conversionRate = useMemo(() => {
    if (!metrics) return 0;
    return metrics.completed_total > 0 
      ? (metrics.converted_total / metrics.completed_total) * 100 
      : 0;
  }, [metrics]);

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                <div className="h-4 bg-muted rounded w-24" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-muted rounded w-16 mb-1" />
              <div className="h-3 bg-muted rounded w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Total Calls Booked */}
      <Card className="card-smooth">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Calls</CardTitle>
          <Phone className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics?.calls_booked_total || 0}</div>
          <p className="text-xs text-muted-foreground">All time bookings</p>
        </CardContent>
      </Card>

      {/* Completed Calls */}
      <Card className="card-smooth">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Completed</CardTitle>
          <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">
            {metrics?.completed_total || 0}
          </div>
          <p className="text-xs text-muted-foreground">
            {showRate.toFixed(1)}% show rate
          </p>
        </CardContent>
      </Card>

      {/* No-Shows */}
      <Card className="card-smooth">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">No-Shows</CardTitle>
          <AlertCircle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
            {metrics?.no_show_total || 0}
          </div>
          <p className="text-xs text-muted-foreground">
            {((100 - showRate)).toFixed(1)}% no-show rate
          </p>
        </CardContent>
      </Card>

      {/* Conversions & Revenue */}
      <Card className="card-smooth">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Conversions</CardTitle>
          <TrendingUp className="h-4 w-4 text-primary" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-primary">
            {metrics?.converted_total || 0}
          </div>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <DollarSign className="h-3 w-3" />
            £{(metrics?.revenue_total || 0).toLocaleString()} • {conversionRate.toFixed(1)}%
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
