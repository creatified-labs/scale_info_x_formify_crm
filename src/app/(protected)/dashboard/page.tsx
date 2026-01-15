"use client";

export const dynamic = 'force-dynamic';
import { useMemo, useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { Calendar, PoundSterling, Target, TrendingUp, ArrowUp, ArrowDown, Phone, UserX, CheckCircle, Activity as ActivityIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RevenueEntryForm } from "@/components/RevenueEntryForm";
import { EntriesList } from "@/components/RevenueHistory";
import { RevenueChart } from "@/components/RevenueChart";
import { CallsToday } from "@/components/CallsToday";
import { FilterPanel } from "@/components/FilterPanel";
import { GoalsManager } from "@/components/GoalsManager";
import CalendarView from "@/components/CalendarView";
import PerformanceGrowth from "@/components/PerformanceGrowth";
import { TrendingUp as TrendingUpIcon, Target as TargetIcon, Calendar as CalendarIcon, BarChart3, Users, Activity } from "lucide-react";
import { useData } from "@/contexts/DataContext";
import { useEntitlements } from "@/contexts/EntitlementsContext";
import { getUsageCurrentCompany } from "@/lib/usage";
import { PreviewBanner } from "@/components/entitlements/PreviewBanner";
import { FilterCriteria } from "@/types/categories";
import { GoalProgress, RevenueEntry } from "@/types/revenue";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { detectWhopContext, readWhopIdentity } from "@/lib/embed";
import { useCurrency } from "@/hooks/useCurrency";

const Index = () => {
  const {
    revenueEntries,
    goals,
    calls,
    categories,
    loading,
    switching,
    addRevenueEntry,
    updateRevenueEntry,
    deleteRevenueEntry,
    addGoal,
    deleteGoal,
    refetch
  } = useData();

  const { companyId } = useParams<{ companyId?: string }>();
  const [orgName, setOrgName] = useState<string | null>(null);
  const [orgEmail, setOrgEmail] = useState<string | null>(null);
  const [orgLoading, setOrgLoading] = useState(false);

  const { user } = useAuth();
  const { entitlements } = useEntitlements();
  const [usage, setUsage] = useState<{ bookingsTotal: number } | null>(null);

  // Use the centralized currency hook for real-time sync across the app
  const { symbol: currencySymbol, loading: currencyLoading } = useCurrency();

  // Resolve organization metadata from Whop embed globals or internal API
  useEffect(() => {
    let cancelled = false;

    const populateFromWhopGlobals = () => {
      if (typeof window === "undefined") return false;
      if (!detectWhopContext()) return false;

      const identity = readWhopIdentity();
      const name = identity.name?.trim();
      const email = identity.email?.trim();

      if (name) setOrgName(name);
      if (email) setOrgEmail(email);
      return Boolean(name || email);
    };

    const populateFromApi = async () => {
      if (!companyId) return;
      try {
        setOrgLoading(true);
        const res = await fetch(`/api/whop/company/${encodeURIComponent(companyId)}`);
        if (!res.ok) {
          console.warn("Whop company API returned", res.status);
          return;
        }
        const data: { companyId?: string; name?: string | null; email?: string | null } = await res.json();
        if (cancelled) return;
        const name = (data.name || "").trim();
        const email = (data.email || "").trim();
        if (name) setOrgName(name);
        if (email) setOrgEmail(email);
      } catch (error) {
        if (!cancelled) {
          console.warn("Error loading Whop company via API", error);
        }
      } finally {
        if (!cancelled) {
          setOrgLoading(false);
        }
      }
    };

    // Prefer Whop embed globals; fall back to API if we have a companyId
    const hadGlobals = populateFromWhopGlobals();
    if (!hadGlobals && companyId) {
      void populateFromApi();
    }

    return () => {
      cancelled = true;
    };
  }, [companyId]);

  useEffect(() => {
    (async () => {
      const u = await getUsageCurrentCompany();
      setUsage({ bookingsTotal: u.bookingsTotal });
    })();
  }, []);

  // Force refetch if revenue entries are missing bookingId (indicates old cached data)
  // This prevents showing doubled values on first load after deployment
  useEffect(() => {
    if (loading || switching || revenueEntries.length === 0) return;

    // Check if any entries have booking_id in metadata but missing bookingId field
    const hasMissingBookingIds = revenueEntries.some(entry =>
      entry.metadata &&
      (entry.metadata as any).booking_id &&
      !entry.bookingId
    );

    if (hasMissingBookingIds) {
      console.log('[Dashboard] Detected old data format, refetching...');
      refetch();
    }
  }, [revenueEntries, loading, switching, refetch]);

  // Note: Bookings are now automatically synced to call_logs via database triggers
  // So we don't need to fetch bookings separately anymore
  // The `calls` array from DataContext already includes both manual calls and bookings

  const [filters, setFilters] = useState<FilterCriteria>({
    dateRange: {},
    categories: [],
    eventTypeIds: [],
    bookingIds: [],
    amountRange: {},
    searchTerm: undefined
  });

  // Revenue entries from the database already include all conversions
  // We no longer need to create synthetic entries - the database is the source of truth
  // This prevents the doubling issue where conversions were counted twice
  const allRevenueEntries = useMemo(() => {
    if (loading || switching) return [];
    
    // Just return the revenue entries directly - no synthetic entries needed
    // The convert-booking edge function already creates revenue_entries in the database
    return revenueEntries;
  }, [revenueEntries, loading, switching]);

  const applyFilters = useCallback(
    (entries: RevenueEntry[]) => {
      if (loading || switching) {
        return [];
      }

      return entries.filter((entry) => {
        // Date range filter
        if (filters.dateRange.from && new Date(entry.date) < filters.dateRange.from) {
          console.log('[Dashboard] Filtered out by dateRange.from:', entry.id, entry.date);
          return false;
        }
        if (filters.dateRange.to && new Date(entry.date) > filters.dateRange.to) {
          console.log('[Dashboard] Filtered out by dateRange.to:', entry.id, entry.date);
          return false;
        }

        // Category filter - only apply if categories are specified
        if (filters.categories.length > 0 && entry.category && !filters.categories.includes(entry.category)) {
          console.log('[Dashboard] Filtered out by category:', entry.id, entry.category, 'not in', filters.categories);
          return false;
        }

        // Amount range filter
        if (filters.amountRange.min !== undefined && entry.amount < filters.amountRange.min) {
          console.log('[Dashboard] Filtered out by amountRange.min:', entry.id, entry.amount);
          return false;
        }
        if (filters.amountRange.max !== undefined && entry.amount > filters.amountRange.max) {
          console.log('[Dashboard] Filtered out by amountRange.max:', entry.id, entry.amount);
          return false;
        }

        // Search term filter
        if (filters.searchTerm) {
          const haystack = `${entry.description ?? ""}`.toLowerCase();
          if (!haystack.includes(filters.searchTerm.toLowerCase())) {
            console.log('[Dashboard] Filtered out by searchTerm:', entry.id);
            return false;
          }
        }

        return true;
      });
    },
    [filters, loading, switching]
  );

  // Filter all revenue entries (including synthetic) based on current filters
  const filteredRevenueEntries = useMemo(() => {
    const filtered = applyFilters(allRevenueEntries);
    console.log('[Dashboard] Filtering revenue entries:', {
      allEntries: allRevenueEntries.length,
      filteredEntries: filtered.length,
      filters,
      entries: allRevenueEntries.map(e => ({ id: e.id, date: e.date, amount: e.amount, category: e.category }))
    });
    return filtered;
  }, [applyFilters, allRevenueEntries, filters]);

  const historyEntries = useMemo(() => {
    return filteredRevenueEntries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [filteredRevenueEntries]);

  const goalProgress = useMemo((): GoalProgress[] => {
    if (loading || switching) {
      return [];
    }

    return goals.map((goal) => {
      // Use filtered revenue entries (which now includes booking conversions)
      let relevantEntries = filteredRevenueEntries;

      // Apply time-based filtering
      if (goal.type === 'daily') {
        relevantEntries = filteredRevenueEntries.filter((entry) => entry.date === goal.period);
      } else if (goal.type === 'weekly') {
        const [year, week] = (goal.period || '').split('-W');
        const weekStart = new Date(parseInt(year), 0, 1 + (parseInt(week) - 1) * 7);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        relevantEntries = filteredRevenueEntries.filter((entry) => {
          const entryDate = new Date(entry.date);
          return entryDate >= weekStart && entryDate <= weekEnd;
        });
      } else if (goal.type === 'monthly') {
        relevantEntries = filteredRevenueEntries.filter((entry) => entry.date.startsWith(goal.period || ''));
      } else if (goal.type === 'yearly') {
        relevantEntries = filteredRevenueEntries.filter((entry) => entry.date.startsWith(goal.period || ''));
      }

      const currentAmount = relevantEntries.reduce((sum, entry) => sum + entry.amount, 0);
      return {
        goal,
        currentAmount,
        progressPercentage: Math.min((currentAmount / goal.targetAmount) * 100, 100),
        isCompleted: currentAmount >= goal.targetAmount,
        daysRemaining: 0,
      };
    });
  }, [loading, switching, goals, filteredRevenueEntries]);

  const summaryStats = useMemo(() => {
    if (loading || switching) {
      return {
        totalRevenue: 0,
        totalEntries: 0,
        thisMonthRevenue: 0,
        thisWeekRevenue: 0,
        completedGoals: 0,
        totalGoals: 0,
        monthlyGrowth: 0,
        weeklyGrowth: 0,
        currentConversionRate: 0,
        conversionGrowth: 0,
        currentMonthConversions: 0,
      };
    }

    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
    const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthKey = `${lastMonthDate.getFullYear()}-${(lastMonthDate.getMonth() + 1).toString().padStart(2, '0')}`;

    // Calculate revenue from filtered revenue entries (includes both manual entries and converted calls)
    const revenueForRange = (predicate: (date: Date) => boolean) =>
      filteredRevenueEntries.reduce((sum, entry) => {
        const entryDate = new Date(entry.date);
        return predicate(entryDate) ? sum + entry.amount : sum;
      }, 0);

    const totalRevenue = revenueForRange(() => true);
    const totalEntries = filteredRevenueEntries.length;
    const thisMonthRevenue = revenueForRange((date) =>
      date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth()
    );
    const lastMonthRevenue = revenueForRange((date) =>
      date.getFullYear() === lastMonthDate.getFullYear() && date.getMonth() === lastMonthDate.getMonth()
    );

    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    const startOfLastWeek = new Date(startOfWeek);
    startOfLastWeek.setDate(startOfLastWeek.getDate() - 7);

    const thisWeekRevenue = revenueForRange((date) => date >= startOfWeek);
    const lastWeekRevenue = revenueForRange((date) => date >= startOfLastWeek && date < startOfWeek);

    // Calculate conversion metrics (calls array now includes synced bookings)
    const currentMonthCalls = calls.filter((call) => call.date.startsWith(currentMonthKey));
    const lastMonthCalls = calls.filter((call) => call.date.startsWith(lastMonthKey));

    const currentMonthConversions = currentMonthCalls.filter((call) => call.isConverted).length;
    const lastMonthConversions = lastMonthCalls.filter((call) => call.isConverted).length;

    const currentMonthCompletedCalls = currentMonthCalls.filter((call) => call.status === 'completed').length;
    const lastMonthCompletedCalls = lastMonthCalls.filter((call) => call.status === 'completed').length;
    
    const currentConversionRate = currentMonthCompletedCalls > 0
      ? (currentMonthConversions / currentMonthCompletedCalls) * 100
      : 0;
    const lastConversionRate = lastMonthCompletedCalls > 0
      ? (lastMonthConversions / lastMonthCompletedCalls) * 100
      : 0;

    const monthlyGrowth = lastMonthRevenue > 0 ? ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 : 0;
    const weeklyGrowth = lastWeekRevenue > 0 ? ((thisWeekRevenue - lastWeekRevenue) / lastWeekRevenue) * 100 : 0;
    const conversionGrowth = lastConversionRate > 0 ? ((currentConversionRate - lastConversionRate) / lastConversionRate) * 100 : 0;
    const completedGoals = goalProgress.filter((gp) => gp.isCompleted).length;
    const totalGoals = goals.length;

    return {
      totalRevenue,
      totalEntries,
      thisMonthRevenue,
      thisWeekRevenue,
      completedGoals,
      totalGoals,
      monthlyGrowth,
      weeklyGrowth,
      currentConversionRate,
      conversionGrowth,
      currentMonthConversions,
    };
  }, [loading, switching, filteredRevenueEntries, calls, goalProgress, goals]);

  const analyticsCallMetrics = useMemo(() => {
    if (loading || switching) {
      return {
        total: 0,
        completed: 0,
        noShow: 0,
        cancelled: 0,
        conversions: 0,
        revenue: 0,
        showRate: 0,
        conversionRate: 0,
      };
    }

    // The calls array now includes both manual calls AND synced bookings
    const total = calls.length;
    const completed = calls.filter((call) => call.status === 'completed').length;
    const noShow = calls.filter((call) => call.status === 'no-show').length;
    const cancelled = calls.filter((call) => call.status === 'cancelled').length;
    const conversions = calls.filter((call) => call.isConverted).length;
    const revenue = calls.reduce((sum, call) => sum + Number(call.conversionAmount ?? 0), 0);

    const showRate = completed + noShow > 0 ? (completed / (completed + noShow)) * 100 : 0;
    const conversionRate = completed > 0 ? (conversions / completed) * 100 : 0;

    return {
      total,
      completed,
      noShow,
      cancelled,
      conversions,
      revenue,
      showRate,
      conversionRate,
    };
  }, [calls, loading, switching]);

  const formatGrowthIndicator = (growth: number) => {
    if (growth === 0) return null;
    const isPositive = growth > 0;
    const absGrowth = Math.abs(growth);
    return <div className={`flex items-center gap-1 animate-fade-in ${isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
        {isPositive ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
        <span className="text-xs font-medium">
          {absGrowth.toFixed(1)}%
        </span>
      </div>;
  };

  if (loading || switching) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">{switching ? 'Switching company...' : 'Loading dashboard...'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
            {orgName ? `Pipeline for ${orgName}` : "Revenue & Conversion Dashboard"}
          </h1>
          <p className="text-muted-foreground">
            {orgLoading
              ? "Loading your Whop organization…"
              : orgName
              ? `Welcome back, ${orgName}. Track revenue and conversions for your organization.`
              : "Track your daily revenue and monitor progress towards your goals"}
          </p>
          {orgEmail && (
            <p className="text-xs text-muted-foreground mt-1">
              Primary contact: {orgEmail}
            </p>
          )}
        </div>

        {entitlements.plan_id === 'preview' && usage && (
          <PreviewBanner used={usage.bookingsTotal} limit={10} />
        )}

        {/* Filter Panel */}
        <FilterPanel
          filters={filters}
          onFiltersChange={setFilters}
          totalEntries={allRevenueEntries.length}
          filteredEntries={historyEntries.length}
        />

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <Card className="card-smooth">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-responsive">Total Revenue</CardTitle>
              <PoundSterling className="h-5 w-5 text-muted-foreground flex-shrink-0" />
            </CardHeader>
            <CardContent className="pb-4">
              <div className="text-2xl lg:text-3xl number-display text-primary">
                {currencyLoading ? '' : currencySymbol}{summaryStats.totalRevenue.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                From {summaryStats.totalEntries} {summaryStats.totalEntries === 1 ? 'conversion' : 'conversions'}
              </p>
            </CardContent>
          </Card>

          <Card className="card-smooth">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-responsive">This Month</CardTitle>
              <Calendar className="h-5 w-5 text-muted-foreground flex-shrink-0" />
            </CardHeader>
            <CardContent className="pb-4">
              <div className="text-2xl lg:text-3xl number-display text-primary">
                {currencyLoading ? '' : currencySymbol}{summaryStats.thisMonthRevenue.toLocaleString()}
              </div>
              <div className="flex items-center justify-between mt-1">
                <p className="text-xs text-muted-foreground">
                  Current month revenue
                </p>
                {formatGrowthIndicator(summaryStats.monthlyGrowth)}
              </div>
            </CardContent>
          </Card>

          <Card className="card-smooth">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-responsive">This Week</CardTitle>
              <TrendingUp className="h-5 w-5 text-muted-foreground flex-shrink-0" />
            </CardHeader>
            <CardContent className="pb-4">
              <div className="text-2xl lg:text-3xl number-display text-primary">
                {currencyLoading ? '' : currencySymbol}{summaryStats.thisWeekRevenue.toLocaleString()}
              </div>
              <div className="flex items-center justify-between mt-1">
                <p className="text-xs text-muted-foreground">
                  Current week revenue
                </p>
                {formatGrowthIndicator(summaryStats.weeklyGrowth)}
              </div>
            </CardContent>
          </Card>

          <Card className="card-smooth">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-responsive">Conversions</CardTitle>
              <Target className="h-5 w-5 text-muted-foreground flex-shrink-0" />
            </CardHeader>
            <CardContent className="pb-4">
              <div className="text-2xl lg:text-3xl number-display text-primary">
                {summaryStats.currentMonthConversions}
              </div>
              <div className="flex items-center justify-between mt-1">
                <p className="text-xs text-muted-foreground">
                  {summaryStats.currentConversionRate.toFixed(1)}% rate this month
                </p>
                {formatGrowthIndicator(summaryStats.conversionGrowth)}
              </div>
            </CardContent>
          </Card>

          <Card className="card-smooth">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-responsive">Calls This Month</CardTitle>
              <Phone className="h-5 w-5 text-muted-foreground flex-shrink-0" />
            </CardHeader>
            <CardContent className="pb-4">
              <div className="text-2xl lg:text-3xl number-display text-primary">
                {calls.filter(call => {
                const now = new Date();
                const currentMonth = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
                const isThisMonth = call.date.startsWith(currentMonth);
                const isActive = call.status === 'scheduled' || call.status === 'completed' || call.status === "hasn't paid yet";
                return isThisMonth && isActive;
              }).length}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Active calls
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList className="tabs-list-enhanced">
            <TabsTrigger value="dashboard" className="tab-trigger-enhanced gap-3">
              <BarChart3 className="w-5 h-5" />
              <span className="hidden sm:inline">Dashboard</span>
              <span className="sm:hidden">Stats</span>
            </TabsTrigger>
            <TabsTrigger value="analytics" className="tab-trigger-enhanced gap-3">
              <BarChart3 className="w-5 h-5" />
              <span className="hidden sm:inline">Analytics</span>
              <span className="sm:hidden">Analytics</span>
            </TabsTrigger>
            <TabsTrigger value="performance" className="tab-trigger-enhanced gap-3">
              <Activity className="w-5 h-5" />
              <span className="hidden sm:inline">Performance</span>
              <span className="sm:hidden">Perf</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="tab-trigger-enhanced gap-3">
              <TrendingUpIcon className="w-5 h-5" />
              <span className="hidden sm:inline">History</span>
              <span className="sm:hidden">Log</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <RevenueChart entries={filteredRevenueEntries} />
              <div>
                <CallsToday />
              </div>
            </div>
            
            <GoalsManager 
              goals={goals}
              goalProgress={goalProgress}
              onAddGoal={addGoal}
              onDeleteGoal={deleteGoal}
            />
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                  <CardTitle className="text-sm font-medium">Calls Booked</CardTitle>
                  <Phone className="h-5 w-5 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {calls.filter(call => {
                      const now = new Date();
                      const currentMonth = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
                      const isThisMonth = call.date.startsWith(currentMonth);
                      const isActive = call.status === 'scheduled' || call.status === 'completed' || call.status === "hasn't paid yet";
                      return isThisMonth && isActive;
                    }).length}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Active calls this month
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                  <CardTitle className="text-sm font-medium">Converted Calls</CardTitle>
                  <Target className="h-5 w-5 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {calls.filter(call => {
                      const now = new Date();
                      const currentMonth = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
                      const isThisMonth = call.date.startsWith(currentMonth);
                      const isActive = call.status === 'scheduled' || call.status === 'completed' || call.status === "hasn't paid yet";
                      return isThisMonth && call.isConverted && isActive;
                    }).length}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {summaryStats.currentConversionRate.toFixed(1)}% conversion rate
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                  <CardTitle className="text-sm font-medium">Sales Made</CardTitle>
                  <PoundSterling className="h-5 w-5 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {currencyLoading ? '' : currencySymbol}{summaryStats.thisMonthRevenue.toLocaleString()}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Total revenue this month
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Call Analytics Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Phone className="w-5 h-5" />
                  Call Performance Metrics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">Total Calls</p>
                    <p className="text-2xl font-bold">{analyticsCallMetrics.total}</p>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">Completed</p>
                    <p className="text-2xl font-bold text-green-600">{analyticsCallMetrics.completed}</p>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">No Shows</p>
                    <p className="text-2xl font-bold text-orange-600">{analyticsCallMetrics.noShow}</p>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">Show Rate</p>
                    <p className="text-2xl font-bold text-green-600">
                      {analyticsCallMetrics.showRate.toFixed(1)}%
                    </p>
                    <p className="text-xs text-muted-foreground">Completed vs No-shows</p>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">Conversions</p>
                    <p className="text-2xl font-bold text-primary">{analyticsCallMetrics.conversions}</p>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">Conversion Rate</p>
                    <p className="text-2xl font-bold text-primary">
                      {analyticsCallMetrics.conversionRate.toFixed(1)}%
                    </p>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">Revenue</p>
                    <p className="text-2xl font-bold text-primary">
                      {currencyLoading ? '' : currencySymbol}{analyticsCallMetrics.revenue.toLocaleString()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <RevenueChart entries={filteredRevenueEntries} />
              <Card>
                <CardHeader>
                  <CardTitle>Call Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Completed Calls</span>
                        <span className="text-sm text-muted-foreground">
                          {calls.filter(call => {
                            const now = new Date();
                            const currentMonth = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
                            return call.date.startsWith(currentMonth) && call.status === 'completed';
                          }).length}
                        </span>
                      </div>
                      <Progress
                        value={(() => {
                          const now = new Date();
                          const currentMonth = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
                          const completed = calls.filter(call =>
                            call.date.startsWith(currentMonth) && call.status === 'completed'
                          ).length;
                          const active = calls.filter(call => {
                            const isThisMonth = call.date.startsWith(currentMonth);
                            const isActive = call.status === 'scheduled' || call.status === 'completed' || call.status === "hasn't paid yet";
                            return isThisMonth && isActive;
                          }).length;
                          return active > 0 ? (completed / active) * 100 : 0;
                        })()}
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Cancelled Calls</span>
                        <span className="text-sm text-muted-foreground">
                          {calls.filter(call => {
                            const now = new Date();
                            const currentMonth = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
                            return call.date.startsWith(currentMonth) && call.status === 'cancelled';
                          }).length}
                        </span>
                      </div>
                      <Progress
                        value={(() => {
                          const now = new Date();
                          const currentMonth = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
                          const cancelled = calls.filter(call =>
                            call.date.startsWith(currentMonth) && call.status === 'cancelled'
                          ).length;
                          const active = calls.filter(call => {
                            const isThisMonth = call.date.startsWith(currentMonth);
                            const isActive = call.status === 'scheduled' || call.status === 'completed' || call.status === "hasn't paid yet";
                            return isThisMonth && isActive;
                          }).length;
                          return active > 0 ? (cancelled / active) * 100 : 0;
                        })()}
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">No-Show Calls</span>
                        <span className="text-sm text-muted-foreground">
                          {calls.filter(call => {
                            const now = new Date();
                            const currentMonth = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
                            return call.date.startsWith(currentMonth) && call.status === 'no-show';
                          }).length}
                        </span>
                      </div>
                      <Progress
                        value={(() => {
                          const now = new Date();
                          const currentMonth = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
                          const noShow = calls.filter(call =>
                            call.date.startsWith(currentMonth) && call.status === 'no-show'
                          ).length;
                          const active = calls.filter(call => {
                            const isThisMonth = call.date.startsWith(currentMonth);
                            const isActive = call.status === 'scheduled' || call.status === 'completed' || call.status === "hasn't paid yet";
                            return isThisMonth && isActive;
                          }).length;
                          return active > 0 ? (noShow / active) * 100 : 0;
                        })()}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="performance" className="space-y-6">
            <PerformanceGrowth />
          </TabsContent>

          <TabsContent value="history" className="space-y-6">
            <EntriesList
              entries={historyEntries}
              onDeleteEntry={deleteRevenueEntry}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Index;