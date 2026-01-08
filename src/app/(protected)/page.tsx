"use client";

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
const Index = () => {
  const {
    revenueEntries,
    goals,
    calls,
    categories,
    loading,
    addRevenueEntry,
    updateRevenueEntry,
    deleteRevenueEntry,
    addGoal,
    deleteGoal
  } = useData();

  const { companyId } = useParams<{ companyId?: string }>();
  const [orgName, setOrgName] = useState<string | null>(null);
  const [orgEmail, setOrgEmail] = useState<string | null>(null);
  const [orgLoading, setOrgLoading] = useState(false);

  const { user } = useAuth();
  const { entitlements } = useEntitlements();
  const [usage, setUsage] = useState<{ bookingsTotal: number } | null>(null);
  const [bookings, setBookings] = useState<any[]>([]);

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

  // Fetch bookings for revenue from automated conversions
  useEffect(() => {
    const fetchBookings = async () => {
      const { data } = await supabase
        .from('bookings')
        .select('*, event_types(id, name)')
        .neq('status', 'canceled') // Exclude deleted/cancelled bookings
        .order('start_time', { ascending: true });

      if (data) {
        setBookings(data);
      }
    };

    fetchBookings();
  }, []);

  const [filters, setFilters] = useState<FilterCriteria>({
    dateRange: {},
    categories: [],
    amountRange: {},
    searchTerm: undefined
  });

  const bookingRevenueEntries = useMemo<RevenueEntry[]>(() => {
    if (!bookings?.length) return [];

    return bookings
      .filter((booking: any) => booking?.is_converted && Number(booking?.conversion_amount ?? 0) > 0)
      .map((booking: any) => {
        const baseDate = booking?.start_time || booking?.end_time || booking?.created_at;
        const entryDate = baseDate ? new Date(baseDate).toISOString().split("T")[0] : new Date().toISOString().split("T")[0];

        const metadata: Record<string, unknown> = {
          source: "booking",
          bookingId: booking.id,
        };

        // Find the "Booking Conversions" category from the database
        const bookingCategory = categories.find(c => c.name === "Booking Conversions");
        
        // Extract event type information if available
        const eventTypeName = booking.event_types?.name || booking.event_type_name;
        const eventTypeId = booking.event_types?.id || booking.event_type_id;
        
        return {
          id: `booking-${booking.id}`,
          date: entryDate,
          amount: Number(booking.conversion_amount ?? 0),
          description: booking.invitee_name
            ? `${booking.invitee_name} booking conversion`
            : "Booking conversion",
          category: bookingCategory?.id || "booking_conversion",
          categoryName: bookingCategory?.name || "Booking Conversions",
          categoryColor: bookingCategory?.color || "#6366F1",
          createdAt: new Date(baseDate ?? Date.now()),
          metadata,
          eventTypeId: eventTypeId || undefined,
          eventTypeName: eventTypeName || undefined,
        } satisfies RevenueEntry;
      });
  }, [bookings, categories]);

  const applyFilters = useCallback(
    (entries: RevenueEntry[]) => {
      if (loading) {
        return [];
      }

      return entries.filter((entry) => {
        if (filters.dateRange.from && new Date(entry.date) < filters.dateRange.from) {
          return false;
        }
        if (filters.dateRange.to && new Date(entry.date) > filters.dateRange.to) {
          return false;
        }

        if (filters.categories.length > 0 && entry.category && !filters.categories.includes(entry.category)) {
          return false;
        }

        if (filters.amountRange.min !== undefined && entry.amount < filters.amountRange.min) {
          return false;
        }
        if (filters.amountRange.max !== undefined && entry.amount > filters.amountRange.max) {
          return false;
        }

        if (filters.searchTerm) {
          const haystack = `${entry.description ?? ""}`.toLowerCase();
          if (!haystack.includes(filters.searchTerm.toLowerCase())) {
            return false;
          }
        }

        return true;
      });
    },
    [filters, loading]
  );

  // Filter revenue entries based on current filters
  const filteredRevenueEntries = useMemo(() => applyFilters(revenueEntries), [applyFilters, revenueEntries]);
  const filteredBookingRevenueEntries = useMemo(
    () => applyFilters(bookingRevenueEntries),
    [applyFilters, bookingRevenueEntries]
  );

  const historyEntries = useMemo(() => {
    const combined = [...filteredRevenueEntries];
    const existingIds = new Set(combined.map((entry) => entry.id));

    filteredBookingRevenueEntries.forEach((entry) => {
      if (!existingIds.has(entry.id)) {
        combined.push(entry);
      }
    });

    return combined.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [filteredRevenueEntries, filteredBookingRevenueEntries]);

  const goalProgress = useMemo((): GoalProgress[] => {
    if (loading) {
      return [];
    }

    return goals.map((goal) => {
      // Combine filtered revenue entries with booking revenue entries
      const allEntries = [...filteredRevenueEntries, ...filteredBookingRevenueEntries];

      let relevantEntries = allEntries;

      // Apply time-based filtering
      if (goal.type === 'daily') {
        relevantEntries = allEntries.filter((entry) => entry.date === goal.period);
      } else if (goal.type === 'weekly') {
        const [year, week] = (goal.period || '').split('-W');
        const weekStart = new Date(parseInt(year), 0, 1 + (parseInt(week) - 1) * 7);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        relevantEntries = allEntries.filter((entry) => {
          const entryDate = new Date(entry.date);
          return entryDate >= weekStart && entryDate <= weekEnd;
        });
      } else if (goal.type === 'monthly') {
        relevantEntries = allEntries.filter((entry) => entry.date.startsWith(goal.period || ''));
      } else if (goal.type === 'yearly') {
        relevantEntries = allEntries.filter((entry) => entry.date.startsWith(goal.period || ''));
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
  }, [loading, goals, filteredRevenueEntries, filteredBookingRevenueEntries]);

  const summaryStats = useMemo(() => {
    if (loading) {
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

    const totalRevenueManual = filteredRevenueEntries.reduce((sum, entry) => sum + entry.amount, 0);
    const totalEntries = filteredRevenueEntries.length + filteredBookingRevenueEntries.length;

    const callRevenueForRange = (predicate: (date: Date) => boolean) =>
      calls.reduce((sum, call) => {
        if (!call.isConverted || typeof call.conversionAmount !== 'number') return sum;
        const callDate = new Date(call.date);
        return predicate(callDate) ? sum + Number(call.conversionAmount || 0) : sum;
      }, 0);

    // Include booking conversions revenue
    const bookingRevenueForRange = (predicate: (date: Date) => boolean) =>
      filteredBookingRevenueEntries.reduce((sum, entry) => {
        const entryDate = new Date(entry.date);
        return predicate(entryDate) ? sum + entry.amount : sum;
      }, 0);

    const callsConversionTotal = callRevenueForRange(() => true);
    const callsConversionThisMonth = callRevenueForRange((date) =>
      date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth()
    );
    const callsConversionLastMonth = callRevenueForRange((date) =>
      date.getFullYear() === lastMonthDate.getFullYear() && date.getMonth() === lastMonthDate.getMonth()
    );

    const bookingsConversionTotal = bookingRevenueForRange(() => true);
    const bookingsConversionThisMonth = bookingRevenueForRange((date) =>
      date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth()
    );
    const bookingsConversionLastMonth = bookingRevenueForRange((date) =>
      date.getFullYear() === lastMonthDate.getFullYear() && date.getMonth() === lastMonthDate.getMonth()
    );

    const thisMonthRevenueManual = filteredRevenueEntries
      .filter((entry) => entry.date.startsWith(currentMonthKey))
      .reduce((sum, entry) => sum + entry.amount, 0);
    const lastMonthRevenueManual = filteredRevenueEntries
      .filter((entry) => entry.date.startsWith(lastMonthKey))
      .reduce((sum, entry) => sum + entry.amount, 0);

    const totalRevenue = totalRevenueManual + callsConversionTotal + bookingsConversionTotal;
    const thisMonthRevenue = thisMonthRevenueManual + callsConversionThisMonth + bookingsConversionThisMonth;
    const lastMonthRevenue = lastMonthRevenueManual + callsConversionLastMonth + bookingsConversionLastMonth;

    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    const startOfLastWeek = new Date(startOfWeek);
    startOfLastWeek.setDate(startOfLastWeek.getDate() - 7);

    const thisWeekRevenueManual = filteredRevenueEntries
      .filter((entry) => new Date(entry.date) >= startOfWeek)
      .reduce((sum, entry) => sum + entry.amount, 0);
    const lastWeekRevenueManual = filteredRevenueEntries
      .filter((entry) => {
        const entryDate = new Date(entry.date);
        return entryDate >= startOfLastWeek && entryDate < startOfWeek;
      })
      .reduce((sum, entry) => sum + entry.amount, 0);

    const thisWeekRevenueCalls = callRevenueForRange((date) => date >= startOfWeek);
    const lastWeekRevenueCalls = callRevenueForRange((date) => date >= startOfLastWeek && date < startOfWeek);

    const thisWeekRevenueBookings = bookingRevenueForRange((date) => date >= startOfWeek);
    const lastWeekRevenueBookings = bookingRevenueForRange((date) => date >= startOfLastWeek && date < startOfWeek);

    const thisWeekRevenue = thisWeekRevenueManual + thisWeekRevenueCalls + thisWeekRevenueBookings;
    const lastWeekRevenue = lastWeekRevenueManual + lastWeekRevenueCalls + lastWeekRevenueBookings;

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
  }, [loading, filteredRevenueEntries, bookings, calls, goalProgress, goals]);

  const analyticsCallMetrics = useMemo(() => {
    if (loading) {
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
  }, [calls, loading]);

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

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading dashboard...</p>
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
          totalEntries={revenueEntries.length + bookingRevenueEntries.length}
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
                £{summaryStats.totalRevenue.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                From {summaryStats.totalEntries} entries
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
                £{summaryStats.thisMonthRevenue.toLocaleString()}
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
                £{summaryStats.thisWeekRevenue.toLocaleString()}
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
                return call.date.startsWith(currentMonth);
              }).length}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Total calls made
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
                      return call.date.startsWith(currentMonth);
                    }).length}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    This month
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
                      return call.date.startsWith(currentMonth) && call.isConverted;
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
                    £{summaryStats.thisMonthRevenue.toLocaleString()}
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
                      £{analyticsCallMetrics.revenue.toLocaleString()}
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
                        value={calls.filter(call => {
                          const now = new Date();
                          const currentMonth = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
                          return call.date.startsWith(currentMonth) && call.status === 'completed';
                        }).length / calls.filter(call => {
                          const now = new Date();
                          const currentMonth = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
                          return call.date.startsWith(currentMonth);
                        }).length * 100 || 0} 
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
                        value={calls.filter(call => {
                          const now = new Date();
                          const currentMonth = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
                          return call.date.startsWith(currentMonth) && call.status === 'cancelled';
                        }).length / calls.filter(call => {
                          const now = new Date();
                          const currentMonth = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
                          return call.date.startsWith(currentMonth);
                        }).length * 100 || 0} 
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
                        value={calls.filter(call => {
                          const now = new Date();
                          const currentMonth = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
                          return call.date.startsWith(currentMonth) && call.status === 'no-show';
                        }).length / calls.filter(call => {
                          const now = new Date();
                          const currentMonth = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
                          return call.date.startsWith(currentMonth);
                        }).length * 100 || 0} 
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