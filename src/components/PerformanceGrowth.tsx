"use client";

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrendingUp, TrendingDown, Target, Users, Phone, PoundSterling, BarChart3, Calendar } from 'lucide-react';
import { useData } from '@/contexts/DataContext';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { format, subDays, subWeeks, subMonths, startOfWeek, startOfMonth, endOfWeek, endOfMonth } from 'date-fns';
import { useCurrency } from '@/hooks/useCurrency';

const PerformanceGrowth = () => {
  const { symbol: currencySymbol } = useCurrency();
  console.log('PerformanceGrowth rendering...');
  const { revenueEntries, goals, calls } = useData();
  console.log('PerformanceGrowth data:', { revenueEntries, goals, calls });

  // Calculate performance metrics
  const performanceMetrics = useMemo(() => {
    const now = new Date();
    const currentMonth = format(now, 'yyyy-MM');
    const lastMonth = format(subMonths(now, 1), 'yyyy-MM');
    const currentWeek = { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) };
    const lastWeek = { start: startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 }), end: endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 }) };

    const callRevenueForFilter = (filterFn: (callDate: Date, call: typeof calls[number]) => boolean) =>
      calls.reduce((sum, call) => {
        if (!call.isConverted || typeof call.conversionAmount !== 'number') {
          return sum;
        }
        const callDate = new Date(call.date);
        return filterFn(callDate, call) ? sum + Number(call.conversionAmount ?? 0) : sum;
      }, 0);

    // Revenue metrics
    const currentMonthRevenueManual = revenueEntries
      .filter(entry => entry.date.startsWith(currentMonth))
      .reduce((sum, entry) => sum + entry.amount, 0);

    const currentMonthRevenueConverted = callRevenueForFilter((callDate) =>
      callDate.getFullYear() === now.getFullYear() &&
      callDate.getMonth() === now.getMonth()
    );

    const currentMonthRevenue = currentMonthRevenueManual + currentMonthRevenueConverted;

    const lastMonthReference = subMonths(now, 1);
    const lastMonthRevenueManual = revenueEntries
      .filter(entry => entry.date.startsWith(lastMonth))
      .reduce((sum, entry) => sum + entry.amount, 0);

    const lastMonthRevenueConverted = callRevenueForFilter((callDate) =>
      callDate.getFullYear() === lastMonthReference.getFullYear() &&
      callDate.getMonth() === lastMonthReference.getMonth()
    );

    const lastMonthRevenue = lastMonthRevenueManual + lastMonthRevenueConverted;

    const currentWeekRevenueManual = revenueEntries
      .filter(entry => {
        const entryDate = new Date(entry.date);
        return entryDate >= currentWeek.start && entryDate <= currentWeek.end;
      })
      .reduce((sum, entry) => sum + entry.amount, 0);

    const currentWeekRevenueConverted = callRevenueForFilter((callDate) =>
      callDate >= currentWeek.start && callDate <= currentWeek.end
    );

    const currentWeekRevenue = currentWeekRevenueManual + currentWeekRevenueConverted;

    const lastWeekRevenueManual = revenueEntries
      .filter(entry => {
        const entryDate = new Date(entry.date);
        return entryDate >= lastWeek.start && entryDate <= lastWeek.end;
      })
      .reduce((sum, entry) => sum + entry.amount, 0);

    const lastWeekRevenueConverted = callRevenueForFilter((callDate) =>
      callDate >= lastWeek.start && callDate <= lastWeek.end
    );

    const lastWeekRevenue = lastWeekRevenueManual + lastWeekRevenueConverted;

    // Call metrics
    const currentMonthCalls = calls.filter(call => call.date.startsWith(currentMonth));
    const lastMonthCalls = calls.filter(call => call.date.startsWith(lastMonth));
    
    const currentWeekCalls = calls.filter(call => {
      const callDate = new Date(call.date);
      return callDate >= currentWeek.start && callDate <= currentWeek.end;
    });

    const lastWeekCalls = calls.filter(call => {
      const callDate = new Date(call.date);
      return callDate >= lastWeek.start && callDate <= lastWeek.end;
    });

    // Conversion rates
    const currentMonthCompletedCalls = currentMonthCalls.filter(call => call.status === 'completed').length;
    const currentMonthConversions = currentMonthCalls.filter(call => call.isConverted).length;
    const currentMonthConversionRate = currentMonthCompletedCalls > 0 ? (currentMonthConversions / currentMonthCompletedCalls) * 100 : 0;

    const lastMonthCompletedCalls = lastMonthCalls.filter(call => call.status === 'completed').length;
    const lastMonthConversions = lastMonthCalls.filter(call => call.isConverted).length;
    const lastMonthConversionRate = lastMonthCompletedCalls > 0 ? (lastMonthConversions / lastMonthCompletedCalls) * 100 : 0;

    // Calculate growth percentages
    const revenueGrowthMonth = lastMonthRevenue > 0 ? ((currentMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 : 0;
    const revenueGrowthWeek = lastWeekRevenue > 0 ? ((currentWeekRevenue - lastWeekRevenue) / lastWeekRevenue) * 100 : 0;
    const callsGrowthMonth = lastMonthCalls.length > 0 ? ((currentMonthCalls.length - lastMonthCalls.length) / lastMonthCalls.length) * 100 : 0;
    const conversionGrowthMonth = lastMonthConversionRate > 0 ? ((currentMonthConversionRate - lastMonthConversionRate) / lastMonthConversionRate) * 100 : 0;

    return {
      revenue: {
        current: currentMonthRevenue,
        previous: lastMonthRevenue,
        growth: revenueGrowthMonth,
        weekGrowth: revenueGrowthWeek
      },
      calls: {
        current: currentMonthCalls.length,
        previous: lastMonthCalls.length,
        growth: callsGrowthMonth
      },
      conversion: {
        current: currentMonthConversionRate,
        previous: lastMonthConversionRate,
        growth: conversionGrowthMonth
      }
    };
  }, [revenueEntries, calls]);

  // Generate chart data for trends
  const chartData = useMemo(() => {
    const last30Days = Array.from({ length: 30 }, (_, i) => {
      const date = subDays(new Date(), 29 - i);
      const dateStr = format(date, 'yyyy-MM-dd');
      
      const dayRevenue = revenueEntries
        .filter(entry => entry.date === dateStr)
        .reduce((sum, entry) => sum + entry.amount, 0);
      
      const dayCalls = calls.filter(call => call.date === dateStr).length;
      
      return {
        date: format(date, 'MMM d'),
        revenue: dayRevenue,
        calls: dayCalls
      };
    });

    return last30Days;
  }, [revenueEntries, calls]);

  const chartTooltipStyle = useMemo(() => ({
    backgroundColor: 'var(--chart-tooltip-bg, rgba(15,15,15,0.92))',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 8,
    color: 'rgba(255,255,255,0.95)',
    boxShadow: '0 8px 20px rgba(0,0,0,0.35)'
  }), []);

  const chartTooltipLabelStyle = useMemo(() => ({
    color: 'rgba(255,255,255,0.8)',
    fontWeight: 500
  }), []);

  const chartTooltipCursor = useMemo(() => ({
    fill: 'rgba(255,255,255,0.08)'
  }), []);

  // Goal completion analysis
  const goalAnalysis = useMemo(() => {
    const completedGoals = goals.filter(goal => {
      // Calculate if goal is completed based on current progress
      let relevantEntries: typeof revenueEntries = [];
      const now = new Date();

      switch (goal.type) {
        case 'daily':
          relevantEntries = revenueEntries.filter(entry => entry.date === goal.period);
          break;
        case 'weekly':
          const [yearStr, weekStr] = (goal.period || '').split('-W');
          const year = parseInt(yearStr);
          const week = parseInt(weekStr);
          
          relevantEntries = revenueEntries.filter(entry => {
            const entryDate = new Date(entry.date);
            const entryYear = entryDate.getFullYear();
            const entryWeek = Math.ceil(((entryDate.getTime() - new Date(entryYear, 0, 1).getTime()) / 86400000 + new Date(entryYear, 0, 1).getDay() + 1) / 7);
            return entryYear === year && entryWeek === week;
          });
          break;
        case 'monthly':
          relevantEntries = revenueEntries.filter(entry => entry.date.startsWith(goal.period || ''));
          break;
        case 'yearly':
          relevantEntries = revenueEntries.filter(entry => entry.date.startsWith(goal.period || ''));
          break;
      }

      const currentAmount = relevantEntries.reduce((sum, entry) => sum + entry.amount, 0);
      
      return currentAmount >= goal.targetAmount;
    });

    const completionRate = goals.length > 0 ? (completedGoals.length / goals.length) * 100 : 0;
    
    return {
      total: goals.length,
      completed: completedGoals.length,
      completionRate
    };
  }, [goals, revenueEntries]);

  const formatGrowth = (growth: number) => {
    const isPositive = growth >= 0;
    return (
      <div className={`flex items-center gap-1 ${isPositive ? 'text-green-500 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
        {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
        <span className="font-medium">{Math.abs(growth).toFixed(1)}%</span>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <BarChart3 className="w-6 h-6" />
        <h2 className="text-2xl font-bold">Performance & Growth</h2>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="goals">Goals Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
                <PoundSterling className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{currencySymbol}{performanceMetrics.revenue.current.toLocaleString()}</div>
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-2">
                    {formatGrowth(performanceMetrics.revenue.growth)}
                    <span className="text-xs text-muted-foreground">vs last month</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Monthly Calls</CardTitle>
                <Phone className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{performanceMetrics.calls.current}</div>
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-2">
                    {formatGrowth(performanceMetrics.calls.growth)}
                    <span className="text-xs text-muted-foreground">vs last month</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{performanceMetrics.conversion.current.toFixed(1)}%</div>
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-2">
                    {formatGrowth(performanceMetrics.conversion.growth)}
                    <span className="text-xs text-muted-foreground">vs last month</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="trends" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Revenue Trend (30 Days)</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip
                      contentStyle={chartTooltipStyle}
                      labelStyle={chartTooltipLabelStyle}
                      cursor={chartTooltipCursor}
                    />
                    <Line type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Call Volume (30 Days)</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip
                      contentStyle={chartTooltipStyle}
                      labelStyle={chartTooltipLabelStyle}
                      cursor={chartTooltipCursor}
                    />
                    <Bar dataKey="calls" fill="hsl(var(--primary))" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="goals" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Goals</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{goalAnalysis.total}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Completed Goals</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{goalAnalysis.completed}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{goalAnalysis.completionRate.toFixed(1)}%</div>
                <Progress value={goalAnalysis.completionRate} className="mt-2" />
              </CardContent>
            </Card>
          </div>

          {goals.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <Target className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No goals set yet. Create some goals to track your progress!</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Goal Performance Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {goals.map((goal) => {
                    // Calculate goal progress (simplified)
                    let relevantEntries: typeof revenueEntries = [];
                    switch (goal.type) {
                      case 'monthly':
                        relevantEntries = revenueEntries.filter(entry => entry.date.startsWith(goal.period || ''));
                        break;
                      case 'yearly':
                        relevantEntries = revenueEntries.filter(entry => entry.date.startsWith(goal.period || ''));
                        break;
                    }

                    const currentAmount = relevantEntries.reduce((sum, entry) => sum + entry.amount, 0);
                    
                    const progress = (currentAmount / goal.targetAmount) * 100;
                    const isCompleted = progress >= 100;

                    return (
                      <div key={goal.id} className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium capitalize">
                            {goal.type} {goal.goalType} Goal
                          </h4>
                          <Badge variant={isCompleted ? "default" : "secondary"}>
                            {isCompleted ? "Completed" : "In Progress"}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
                          <span>
                            {currencySymbol}{currentAmount.toLocaleString()} / {currencySymbol}{goal.targetAmount.toLocaleString()}
                          </span>
                          <span>{progress.toFixed(1)}%</span>
                        </div>
                        <Progress value={Math.min(progress, 100)} />
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PerformanceGrowth;