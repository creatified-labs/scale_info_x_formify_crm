"use client";

import { useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Area, AreaChart } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LineChart as LineChartIcon, BarChart3, TrendingUp } from "lucide-react";
import { RevenueEntry } from "@/types/revenue";

interface RevenueChartProps {
  entries: RevenueEntry[];
}

export const RevenueChart = ({ entries }: RevenueChartProps) => {
  const chartData = useMemo(() => {
    if (entries.length === 0) return { daily: [], weekly: [], monthly: [] };

    // Sort entries by date
    const sortedEntries = [...entries].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Daily data - group by date
    const dailyData = sortedEntries.reduce((acc, entry) => {
      const date = entry.date;
      const existing = acc.find(item => item.date === date);
      if (existing) {
        existing.revenue += entry.amount;
      } else {
        acc.push({
          date,
          revenue: entry.amount,
          formattedDate: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        });
      }
      return acc;
    }, [] as Array<{ date: string; revenue: number; formattedDate: string }>);

    // Weekly data - group by week
    const weeklyData = sortedEntries.reduce((acc, entry) => {
      const date = new Date(entry.date);
      const year = date.getFullYear();
      const week = Math.ceil(((date.getTime() - new Date(year, 0, 1).getTime()) / 86400000 + new Date(year, 0, 1).getDay() + 1) / 7);
      const weekKey = `${year}-W${week}`;
      
      const existing = acc.find(item => item.week === weekKey);
      if (existing) {
        existing.revenue += entry.amount;
      } else {
        acc.push({
          week: weekKey,
          revenue: entry.amount,
          formattedWeek: `Week ${week}`
        });
      }
      return acc;
    }, [] as Array<{ week: string; revenue: number; formattedWeek: string }>);

    // Monthly data - group by month
    const monthlyData = sortedEntries.reduce((acc, entry) => {
      const date = new Date(entry.date);
      const monthKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
      
      const existing = acc.find(item => item.month === monthKey);
      if (existing) {
        existing.revenue += entry.amount;
      } else {
        acc.push({
          month: monthKey,
          revenue: entry.amount,
          formattedMonth: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
        });
      }
      return acc;
    }, [] as Array<{ month: string; revenue: number; formattedMonth: string }>);

    return { daily: dailyData, weekly: weeklyData, monthly: monthlyData };
  }, [entries]);

  const totalRevenue = entries.reduce((sum, entry) => sum + entry.amount, 0);
  const averageDaily = entries.length > 0 ? totalRevenue / new Set(entries.map(e => e.date)).size : 0;

  if (entries.length === 0) {
    return (
    <Card className="card-smooth">
        <CardContent className="py-8 text-center">
          <LineChartIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No revenue data yet</h3>
          <p className="text-muted-foreground">Add some revenue entries to see your progress charts!</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="card-smooth">
      <CardHeader className="content-spacing">
        <CardTitle className="flex items-center gap-2 text-responsive">
          <TrendingUp className="w-6 h-6 flex-shrink-0" />
          Revenue Analytics
        </CardTitle>
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-6 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <span>Total Revenue:</span>
            <span className="number-display text-foreground text-lg">£{totalRevenue.toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-1">
            <span>Daily Average:</span>
            <span className="number-display text-foreground text-lg">£{averageDaily.toLocaleString()}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="daily" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="daily">Daily</TabsTrigger>
            <TabsTrigger value="weekly">Weekly</TabsTrigger>
            <TabsTrigger value="monthly">Monthly</TabsTrigger>
          </TabsList>

          <TabsContent value="daily" className="space-y-4">
            <div className="h-[300px] animate-fade-in">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData.daily}>
                  <defs>
                    <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.05}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid 
                    strokeDasharray="3 3" 
                    stroke="hsl(var(--border))" 
                    strokeOpacity={0.3}
                  />
                  <XAxis 
                    dataKey="formattedDate" 
                    tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis 
                    tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                    tickFormatter={(value) => `£${value}`}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip 
                    formatter={(value) => [`£${value}`, 'Revenue']}
                    labelFormatter={(label, payload) => {
                      if (payload && payload[0]) {
                        return new Date(payload[0].payload.date).toLocaleDateString();
                      }
                      return label;
                    }}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--popover))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      color: 'hsl(var(--popover-foreground))',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                    }}
                  />
                  <Area
                    type="natural"
                    dataKey="revenue"
                    stroke="hsl(var(--primary))"
                    strokeWidth={3}
                    fill="url(#revenueGradient)"
                    dot={{ 
                      fill: "hsl(var(--primary))", 
                      strokeWidth: 2, 
                      r: 5,
                      className: "transition-all duration-200 hover:r-7"
                    }}
                    activeDot={{ 
                      r: 7, 
                      fill: "hsl(var(--primary))",
                      strokeWidth: 2,
                      stroke: "hsl(var(--background))"
                    }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>

          <TabsContent value="weekly" className="space-y-4">
            <div className="h-[300px] animate-fade-in">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData.weekly}>
                  <defs>
                    <linearGradient id="weeklyGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.9}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.6}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid 
                    strokeDasharray="3 3" 
                    stroke="hsl(var(--border))" 
                    strokeOpacity={0.3}
                  />
                  <XAxis 
                    dataKey="formattedWeek" 
                    tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis 
                    tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                    tickFormatter={(value) => `£${value}`}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip 
                    formatter={(value) => [`£${value}`, 'Revenue']}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--popover))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      color: 'hsl(var(--popover-foreground))',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                    }}
                  />
                  <Bar 
                    dataKey="revenue" 
                    fill="url(#weeklyGradient)" 
                    radius={[6, 6, 0, 0]}
                    className="transition-all duration-200 hover:opacity-80"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>

          <TabsContent value="monthly" className="space-y-4">
            <div className="h-[300px] animate-fade-in">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData.monthly}>
                  <defs>
                    <linearGradient id="monthlyGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.9}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.6}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid 
                    strokeDasharray="3 3" 
                    stroke="hsl(var(--border))" 
                    strokeOpacity={0.3}
                  />
                  <XAxis 
                    dataKey="formattedMonth" 
                    tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis 
                    tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                    tickFormatter={(value) => `£${value}`}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip 
                    formatter={(value) => [`£${value}`, 'Revenue']}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--popover))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      color: 'hsl(var(--popover-foreground))',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                    }}
                  />
                  <Bar 
                    dataKey="revenue" 
                    fill="url(#monthlyGradient)" 
                    radius={[6, 6, 0, 0]}
                    className="transition-all duration-200 hover:opacity-80"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};