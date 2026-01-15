"use client";

export const dynamic = 'force-dynamic';

import { useMemo, useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { getCompanyId } from "@/lib/company";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { TrendingUp, Calendar, PoundSterling, Target, BarChart3, PieChart as PieChartIcon, Activity, Award, Zap, Download } from "lucide-react";
import { RevenueEntry, Goal } from "@/types/revenue";
import { DEFAULT_REVENUE_CATEGORIES } from "@/types/categories";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval } from "date-fns";
import { useEntitlements } from "@/contexts/EntitlementsContext";
import { PlanGate } from "@/components/PlanGate";
import { useFeature } from "@/lib/entitlements/useFeature";
import { LockTile } from "@/components/entitlements/LockTile";
import { useData } from "@/contexts/DataContext";
import { useCurrency } from "@/hooks/useCurrency";

const Analytics = () => {
  const { revenueEntries, goals } = useData();
  const { entitlements } = useEntitlements();
  const hasAdvancedAnalytics = entitlements.analytics_revenue === "advanced";
  const [bookingConversions, setBookingConversions] = useState<any[]>([]);
  const { csvExport, plan } = useFeature();
  const isPreview = plan === 'preview';
  const [previewBookings7, setPreviewBookings7] = useState<number | null>(null);
  const [exportingCsv, setExportingCsv] = useState(false);

  // Use the centralized currency hook for real-time sync across the app
  const { formatAmount, symbol: currencySymbol } = useCurrency();

  // Fetch converted bookings
  useEffect(() => {
    const fetchConversions = async () => {
      const companyId = await getCompanyId({ allowFallback: false });
      if (!companyId) {
        setBookingConversions([]);
        return;
      }

      const { data } = await supabase
        .from('bookings')
        .select('*')
        .eq('company_id', companyId)
        .neq('status', 'canceled') // Exclude deleted/cancelled bookings
        .eq('is_converted', true)
        .not('conversion_amount', 'is', null);
      
      if (data) {
        setBookingConversions(data);
      }
    };

    fetchConversions();
  }, []);

  // Preview-only: fetch bookings count for last 7 days
  useEffect(() => {
    if (!isPreview) return;
    (async () => {
      const now = new Date();
      const sevenDaysAgo = new Date(now);
      sevenDaysAgo.setDate(now.getDate() - 7);
      const companyId = await getCompanyId({ allowFallback: false });
      if (!companyId) { setPreviewBookings7(0); return; }
      const { count } = await (supabase as any)
        .from('bookings')
        .select('id', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .neq('status', 'canceled') // Exclude deleted/cancelled bookings
        .gte('start_time', sevenDaysAgo.toISOString());
      setPreviewBookings7(count || 0);
    })();
  }, [isPreview]);

  // Combine revenue entries with booking conversions
  // Note: Filter out bookings that already have persistent revenue_entries records
  // to prevent double-counting (persistent entries have id format: booking-conversion-{booking_id})
  const allRevenueData = useMemo(() => {
    const persistentRevenueBookingIds = new Set(
      revenueEntries
        .filter(entry => entry.id?.startsWith('booking-conversion-'))
        .map(entry => entry.id?.replace('booking-conversion-', ''))
    );

    const bookingRevenue = bookingConversions
      .filter(booking => !persistentRevenueBookingIds.has(booking.id))
      .map(booking => ({
        id: booking.id,
        date: booking.start_time.split('T')[0],
        amount: Number(booking.conversion_amount),
        description: `Booking: ${booking.invitee_name}`,
        category: 'general',
        createdAt: new Date(booking.converted_at || booking.start_time)
      }));

    return [...revenueEntries, ...bookingRevenue];
  }, [revenueEntries, bookingConversions]);

  const lastUpdatedLabel = useMemo(() => format(new Date(), "MMM d, yyyy 'at' HH:mm"), []);

  const summaryStats = useMemo(() => {
    const manualRevenueTotal = revenueEntries.reduce((sum, entry) => sum + entry.amount, 0);
    const bookingRevenueTotal = bookingConversions.reduce((sum, booking) => sum + Number(booking.conversion_amount ?? 0), 0);
    const totalRevenue = manualRevenueTotal + bookingRevenueTotal;
    return {
      manualRevenueTotal,
      bookingRevenueTotal,
      totalRevenue,
      totalEntries: allRevenueData.length,
      conversionsCount: bookingConversions.length,
      conversionShare: totalRevenue > 0 ? (bookingRevenueTotal / totalRevenue) * 100 : 0,
    };
  }, [revenueEntries, bookingConversions, allRevenueData]);

  const tooltipStyle = useMemo(() => ({
    backgroundColor: 'var(--chart-tooltip-bg, rgba(15,15,15,0.9))',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 8,
    color: 'white'
  }), []);

  const tooltipLabelStyle = useMemo(() => ({ color: 'rgba(255,255,255,0.8)' }), []);

  // Calculate comprehensive analytics with booking conversions
  const analytics = useMemo(() => {
    const now = new Date();
    const thisWeekStart = startOfWeek(now);
    const thisWeekEnd = endOfWeek(now);
    const thisMonthStart = startOfMonth(now);
    const thisMonthEnd = endOfMonth(now);
    const lastWeekStart = new Date(thisWeekStart);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);
    const lastWeekEnd = new Date(thisWeekEnd);
    lastWeekEnd.setDate(lastWeekEnd.getDate() - 7);
    const lastMonthStart = new Date(thisMonthStart);
    lastMonthStart.setMonth(lastMonthStart.getMonth() - 1);
    const lastMonthEnd = new Date(thisMonthEnd);
    lastMonthEnd.setMonth(lastMonthEnd.getMonth() - 1);

    // Filter entries by time periods
    const thisWeekEntries = allRevenueData.filter(entry => isWithinInterval(new Date(entry.date), {
      start: thisWeekStart,
      end: thisWeekEnd
    }));
    const lastWeekEntries = allRevenueData.filter(entry => isWithinInterval(new Date(entry.date), {
      start: lastWeekStart,
      end: lastWeekEnd
    }));
    const thisMonthEntries = allRevenueData.filter(entry => isWithinInterval(new Date(entry.date), {
      start: thisMonthStart,
      end: thisMonthEnd
    }));
    const lastMonthEntries = allRevenueData.filter(entry => isWithinInterval(new Date(entry.date), {
      start: lastMonthStart,
      end: lastMonthEnd
    }));

    // Calculate totals
    const thisWeekTotal = thisWeekEntries.reduce((sum, entry) => sum + entry.amount, 0);
    const lastWeekTotal = lastWeekEntries.reduce((sum, entry) => sum + entry.amount, 0);
    const thisMonthTotal = thisMonthEntries.reduce((sum, entry) => sum + entry.amount, 0);
    const lastMonthTotal = lastMonthEntries.reduce((sum, entry) => sum + entry.amount, 0);
    const weeklyGrowth = lastWeekTotal > 0 ? (thisWeekTotal - lastWeekTotal) / lastWeekTotal * 100 : 0;
    const monthlyGrowth = lastMonthTotal > 0 ? (thisMonthTotal - lastMonthTotal) / lastMonthTotal * 100 : 0;

    // Category breakdown
    const categoryBreakdown = DEFAULT_REVENUE_CATEGORIES.map(category => {
      const categoryEntries = allRevenueData.filter(entry => entry.category === category.id);
      const total = categoryEntries.reduce((sum, entry) => sum + entry.amount, 0);
      const count = categoryEntries.length;
      return {
        ...category,
        total,
        count,
        percentage: allRevenueData.length > 0 ? count / allRevenueData.length * 100 : 0
      };
    }).filter(cat => cat.total > 0);

    // Day of week analysis
    const dayOfWeekData = Array.from({
      length: 7
    }, (_, i) => {
      const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][i];
      const dayEntries = allRevenueData.filter(entry => new Date(entry.date).getDay() === i);
      const total = dayEntries.reduce((sum, entry) => sum + entry.amount, 0);
      const average = dayEntries.length > 0 ? total / dayEntries.length : 0;
      return {
        day: dayName.slice(0, 3),
        total,
        average,
        count: dayEntries.length
      };
    });

    // Monthly trend (last 6 months)
    const monthlyTrend = Array.from({
      length: 6
    }, (_, i) => {
      const date = new Date(now);
      date.setMonth(date.getMonth() - (5 - i));
      const monthStart = startOfMonth(date);
      const monthEnd = endOfMonth(date);
      const monthEntries = allRevenueData.filter(entry => isWithinInterval(new Date(entry.date), {
        start: monthStart,
        end: monthEnd
      }));
      const total = monthEntries.reduce((sum, entry) => sum + entry.amount, 0);
      return {
        month: format(date, 'MMM yyyy'),
        total,
        count: monthEntries.length
      };
    });

    // Performance insights
    const totalRevenue = allRevenueData.reduce((sum, entry) => sum + entry.amount, 0);
    const averagePerEntry = allRevenueData.length > 0 ? totalRevenue / allRevenueData.length : 0;
    const bestDay = dayOfWeekData.length > 0
      ? dayOfWeekData.reduce((best, day) => (day.average > best.average ? day : best), dayOfWeekData[0])
      : null;
    const mostUsedCategory = categoryBreakdown.length > 0
      ? categoryBreakdown.reduce((most, cat) => (cat.count > most.count ? cat : most), categoryBreakdown[0])
      : null;
    return {
      thisWeekTotal,
      lastWeekTotal,
      thisMonthTotal,
      lastMonthTotal,
      weeklyGrowth,
      monthlyGrowth,
      categoryBreakdown,
      dayOfWeekData,
      monthlyTrend,
      totalRevenue,
      averagePerEntry,
      bestDay,
      mostUsedCategory
    };
  }, [allRevenueData]);

  // Goal completion analytics
  const goalAnalytics = useMemo(() => {
    const activeGoals = goals.length;
    const completedGoals = goals.filter(goal => {
      // This is a simplified completion check - you'd want to use your existing goal progress logic
      return false; // Placeholder
    }).length;
    return {
      activeGoals,
      completedGoals,
      completionRate: activeGoals > 0 ? completedGoals / activeGoals * 100 : 0
    };
  }, [goals]);
  if (allRevenueData.length === 0) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-6">
        <div className="max-w-7xl mx-auto">
          <Card className="card-smooth">
            <CardContent className="py-16 text-center">
              <BarChart3 className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-2xl font-semibold mb-2">No Data Yet</h2>
              <p className="text-muted-foreground">
                Add some revenue entries to see detailed analytics and insights.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  async function handleExportCsv() {
    const { data: session } = await supabase.auth.getSession();
    const token = session?.session?.access_token;
    const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/export-csv`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      if (res.status === 403) {
        try {
          const { track } = await import("@/lib/track");
          track("feature_blocked", { feature: "export_csv", code: j.code });
        } catch {}
      }
      throw new Error(j.message || j.error || "Export failed");
    }
  }

  if (isPreview) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-6">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">Analytics</h1>
              <p className="text-muted-foreground">Bookings overview (last 7 days)</p>
            </div>
          </div>

          <div className="max-w-sm">
            <LockTile
              title="Revenue & CSV exports"
              description="Advanced analytics & CSV exports are available on Pro."
              primaryLabel="Start Pro trial (7d)"
              primaryPlan="pro"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card className="card-smooth">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-responsive">
                    Bookings (last 7 days)
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl number-display">{previewBookings7 ?? "—"}</div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  const analyticsContent = (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
              Revenue Analytics
            </h1>
            <p className="text-muted-foreground">
              Deep insights into your revenue patterns and performance · Last refreshed {lastUpdatedLabel}
            </p>
          </div>
          <Button
            variant="outline"
            className="gap-2"
            disabled={!csvExport || exportingCsv}
            onClick={async () => {
              if (!csvExport) return;
              try {
                setExportingCsv(true);
                await handleExportCsv();
              } catch (error) {
                console.error("CSV export failed", error);
              } finally {
                setExportingCsv(false);
              }
            }}
          >
            <Download className="w-4 h-4" />
            {csvExport ? (exportingCsv ? "Preparing CSV..." : "Export CSV") : "Export CSV · Upgrade"}
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <Card className="card-smooth">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Total Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold text-foreground number-display">
                {formatAmount(summaryStats.totalRevenue)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Manual entries: {formatAmount(summaryStats.manualRevenueTotal)}
              </p>
            </CardContent>
          </Card>

          <Card className="card-smooth">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Converted Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold text-foreground number-display">
                {formatAmount(summaryStats.bookingRevenueTotal)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {summaryStats.conversionShare.toFixed(1)}% of total revenue
              </p>
            </CardContent>
          </Card>

          <Card className="card-smooth">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Logged Entries</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold text-foreground number-display">
                {summaryStats.totalEntries}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Across all sources</p>
            </CardContent>
          </Card>

          <Card className="card-smooth">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Conversions Logged</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold text-foreground number-display">
                {summaryStats.conversionsCount}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Booking-to-revenue conversions</p>
            </CardContent>
          </Card>
        </div>

        {/* Key Performance Indicators */}
        <div className="stats-grid">
          <Card className="card-smooth">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-responsive">Weekly Growth</CardTitle>
                <TrendingUp className="h-5 w-5 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div
                className={`text-2xl lg:text-3xl number-display ${
                  analytics.weeklyGrowth >= 0 ? "text-green-600" : "text-red-600"
                }`}
              >
                {analytics.weeklyGrowth >= 0 ? "+" : ""}
                {analytics.weeklyGrowth.toFixed(1)}%
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                vs last week ({formatAmount(analytics.lastWeekTotal)})
              </p>
            </CardContent>
          </Card>

          <Card className="card-smooth">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-responsive">Monthly Growth</CardTitle>
                <Calendar className="h-5 w-5 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div
                className={`text-2xl lg:text-3xl number-display ${
                  analytics.monthlyGrowth >= 0 ? "text-green-600" : "text-red-600"
                }`}
              >
                {analytics.monthlyGrowth >= 0 ? "+" : ""}
                {analytics.monthlyGrowth.toFixed(1)}%
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                vs last month ({formatAmount(analytics.lastMonthTotal)})
              </p>
            </CardContent>
          </Card>

          <Card className="card-smooth">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-responsive">Average per conversion</CardTitle>
                <PoundSterling className="h-5 w-5 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl lg:text-3xl number-display text-primary">
                {formatAmount(analytics.averagePerEntry)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Across {allRevenueData.length} entries
              </p>
            </CardContent>
          </Card>

          <Card className="card-smooth">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-responsive">Best Performance Day</CardTitle>
                <Award className="h-5 w-5 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl lg:text-3xl number-display text-primary">
                {analytics.bestDay?.day ?? "—"}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {analytics.bestDay ? `${formatAmount(analytics.bestDay.average)} average` : "No data yet"}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 lg:gap-8">
          {/* Monthly Trend */}
          <Card className="card-smooth">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-responsive">
                <BarChart3 className="w-6 h-6" />
                Monthly Revenue Trend
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={analytics.monthlyTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} tickFormatter={(value) => `${currencySymbol}${value}`} />
                    <Tooltip
                      formatter={(value) => [`${currencySymbol}${value}`, "Revenue"]}
                      contentStyle={tooltipStyle}
                      labelStyle={tooltipLabelStyle}
                    />
                    <Line
                      type="monotone"
                      dataKey="total"
                      stroke="hsl(var(--primary))"
                      strokeWidth={3}
                      dot={{
                        fill: "hsl(var(--primary))",
                        strokeWidth: 2,
                        r: 5,
                      }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Category Breakdown */}
          <Card className="card-smooth">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-responsive">
                <PieChartIcon className="w-6 h-6" />
                Revenue by Category
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={analytics.categoryBreakdown}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="total"
                    >
                      {analytics.categoryBreakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value) => formatAmount(Number(value))}
                      contentStyle={tooltipStyle}
                      labelStyle={tooltipLabelStyle}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Day of Week Performance */}
          <Card className="card-smooth">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-responsive">
                <Activity className="w-6 h-6" />
                Performance by Day of Week
              </CardTitle>
            </CardHeader>
            <CardContent>
              {analytics.dayOfWeekData.some((day) => day.count > 0) ? (
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analytics.dayOfWeekData} barCategoryGap="30%">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} tickFormatter={(value) => `${currencySymbol}${value}`} />
                      <Tooltip
                      formatter={(value) => [`${currencySymbol}${value}`, "Average"]}
                      contentStyle={tooltipStyle}
                      labelStyle={tooltipLabelStyle}
                    />
                      <Bar
                        dataKey="average"
                        fill="hsl(var(--chart-3, var(--primary)))"
                        radius={[6, 6, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[220px] flex items-center justify-center text-sm text-muted-foreground">
                  Log revenue or conversions to see which days perform best.
                </div>
              )}
            </CardContent>
          </Card>

          {/* Insights Panel */}
          <Card className="card-smooth">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-responsive">
                <Zap className="w-6 h-6" />
                Key Insights
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium">Most Productive Category</p>
                    <p className="text-xs text-muted-foreground">
                      {analytics.mostUsedCategory
                        ? `${analytics.mostUsedCategory.name} accounts for ${analytics.mostUsedCategory.count} entries (${formatAmount(analytics.mostUsedCategory.total)})`
                        : "Categorize revenue entries to unlock this insight."}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium">Best Performance Day</p>
                    <p className="text-xs text-muted-foreground">
                      {analytics.bestDay
                        ? `${analytics.bestDay.day}s generate ${formatAmount(analytics.bestDay.average)} on average`
                        : "Log entries across the week to uncover peak days."}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                  <div className="w-2 h-2 bg-purple-500 rounded-full mt-2 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium">Growth Momentum</p>
                    <p className="text-xs text-muted-foreground">
                      {analytics.weeklyGrowth >= 0 ? "Positive" : "Negative"} weekly trend of
                      {" "}
                      {Math.abs(analytics.weeklyGrowth).toFixed(1)}%
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Category Performance Table */}
        <Card className="card-smooth">
          <CardHeader>
            <CardTitle className="text-responsive">Category Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics.categoryBreakdown.length === 0 && (
                <div className="text-sm text-muted-foreground">
                  No categorized revenue yet. As you log entries, category performance will appear here.
                </div>
              )}
              {analytics.categoryBreakdown.map((category) => (
                <div
                  key={category.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-4 h-4 rounded-full flex-shrink-0"
                      style={{ backgroundColor: category.color }}
                    />
                    <div>
                      <p className="font-medium text-responsive">{category.name}</p>
                      <p className="text-sm text-muted-foreground">{category.count} entries</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium number-display">{formatAmount(category.total)}</p>
                    <p className="text-sm text-muted-foreground">
                      {category.percentage.toFixed(1)}%
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  return (
    <PlanGate isAllowed={hasAdvancedAnalytics} featureName="Advanced Analytics">
      {analyticsContent}
    </PlanGate>
  );
};

export default Analytics;