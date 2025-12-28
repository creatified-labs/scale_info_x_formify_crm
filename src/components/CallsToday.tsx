"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Phone, Clock, User, Mail, Calendar, ChevronLeft, ChevronRight, CheckCircle2, XCircle, AlertCircle, DollarSign, TrendingUp, Target } from "lucide-react";
import { useData } from "@/contexts/DataContext";
import { useMemo, useState, useEffect } from "react";
import { format, addDays, subDays, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type TimeRange = 'last7days' | 'last14days' | 'thisMonth' | 'last30days';

export const CallsToday = () => {
  const { calls } = useData();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [bookings, setBookings] = useState<any[]>([]);
  const [timeRange, setTimeRange] = useState<TimeRange>('thisMonth');

  // Fetch bookings from Supabase
  useEffect(() => {
    const fetchBookings = async () => {
      const { data } = await supabase
        .from('bookings')
        .select('*')
        .order('start_time', { ascending: true });
      
      if (data) {
        setBookings(data);
      }
    };

    fetchBookings();
    
    // Listen for local storage changes (fallback for non-realtime updates)
    const handleStorageChange = () => {
      fetchBookings();
    };
    
    window.addEventListener('storage', handleStorageChange);

    // Realtime: Refetch when bookings table changes
    const channel = supabase
      .channel('public:bookings')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bookings' },
        () => {
          fetchBookings();
        }
      )
      .subscribe();
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      supabase.removeChannel(channel);
    };
  }, []);

  // Calculate booking stats based on selected time range
  const bookingStats = useMemo(() => {
    const now = new Date();
    let startDate: Date;
    let endDate: Date = now;

    switch (timeRange) {
      case 'last7days':
        startDate = subDays(now, 7);
        break;
      case 'last14days':
        startDate = subDays(now, 14);
        break;
      case 'thisMonth':
        startDate = startOfMonth(now);
        endDate = endOfMonth(now);
        break;
      case 'last30days':
        startDate = subDays(now, 30);
        break;
      default:
        startDate = startOfMonth(now);
    }

    const filteredBookings = bookings.filter((booking: any) => {
      const bookingDate = new Date(booking.start_time.split('T')[0]);
      return bookingDate >= startDate && bookingDate <= endDate;
    });

    const completedBookings = filteredBookings.filter((b: any) => b.status === 'completed');
    const noShowBookings = filteredBookings.filter((b: any) => b.status === 'no_show');
    const convertedBookings = filteredBookings.filter((b: any) => b.is_converted);
    
    const noShowRate = completedBookings.length + noShowBookings.length > 0
      ? (noShowBookings.length / (completedBookings.length + noShowBookings.length)) * 100
      : 0;
    
    const conversionRate = completedBookings.length > 0
      ? (convertedBookings.length / completedBookings.length) * 100
      : 0;
    
    const totalConversionRevenue = convertedBookings.reduce((sum: number, b: any) => 
      sum + Number(b.conversion_amount || 0), 0
    );

    return {
      totalBookings: filteredBookings.length,
      completedBookings: completedBookings.length,
      noShowBookings: noShowBookings.length,
      noShowRate,
      convertedBookings: convertedBookings.length,
      conversionRate,
      totalConversionRevenue
    };
  }, [bookings, timeRange]);

  const selectedDateString = useMemo(() => {
    return selectedDate.toISOString().split('T')[0];
  }, [selectedDate]);

  const selectedDayCalls = useMemo(() => {
    return calls
      .filter(call => call.date === selectedDateString)
      .sort((a, b) => a.time.localeCompare(b.time));
  }, [calls, selectedDateString]);

  const upcomingCalls = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return calls
      .filter(call => call.date > today && (call.status === 'scheduled' || call.status === "hasn't paid yet"))
      .sort((a, b) => {
        const dateCompare = a.date.localeCompare(b.date);
        if (dateCompare !== 0) return dateCompare;
        return a.time.localeCompare(b.time);
      })
      .slice(0, 3);
  }, [calls]);

  const handlePrevDay = () => {
    setSelectedDate(prev => subDays(prev, 1));
  };

  const handleNextDay = () => {
    setSelectedDate(prev => addDays(prev, 1));
  };

  const handleToday = () => {
    setSelectedDate(new Date());
  };

  const isToday = selectedDateString === new Date().toISOString().split('T')[0];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-4 h-4" />;
      case 'cancelled':
        return <XCircle className="w-4 h-4" />;
      case 'no-show':
        return <AlertCircle className="w-4 h-4" />;
      case "hasn't paid yet":
        return <DollarSign className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20';
      case 'completed':
        return 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20';
      case 'cancelled':
        return 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20';
      case 'no-show':
        return 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20';
      case "hasn't paid yet":
        return 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getCallTypeColor = (callType: string) => {
    switch (callType) {
      case 'call':
        return 'bg-green-500/10 text-green-600 dark:text-green-400';
      case 'meeting':
        return 'bg-purple-500/10 text-purple-600 dark:text-purple-400';
      case 'consultation':
        return 'bg-blue-500/10 text-blue-600 dark:text-blue-400';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };


  return (
    <Card className="card-smooth">
      <CardHeader className="content-spacing">
        <div className="flex items-center justify-between gap-4">
          <CardTitle className="flex items-center gap-2 text-responsive">
            <Calendar className="w-6 h-6 flex-shrink-0" />
            Daily Call Schedule
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrevDay}
              className="h-8 w-8 p-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant={isToday ? "default" : "outline"}
              size="sm"
              onClick={handleToday}
              className="h-8 px-3 text-xs"
            >
              Today
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleNextDay}
              className="h-8 w-8 p-0"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <p className="text-sm text-muted-foreground mt-2">
          {format(selectedDate, 'EEEE, MMMM d, yyyy')}
        </p>
      </CardHeader>
      <CardContent>
        {/* Time Range Filter */}
        <div className="mb-4">
          <Select value={timeRange} onValueChange={(value) => setTimeRange(value as TimeRange)}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="last7days">Last 7 days</SelectItem>
              <SelectItem value="last14days">Last 14 days</SelectItem>
              <SelectItem value="thisMonth">This month</SelectItem>
              <SelectItem value="last30days">Last 30 days</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Booking Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6 p-4 bg-muted/30 rounded-lg">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Total Bookings</p>
            <p className="text-xl font-bold text-foreground">{bookingStats.totalBookings}</p>
            <p className="text-xs text-muted-foreground">
              {timeRange === 'last7days' && 'Last 7 days'}
              {timeRange === 'last14days' && 'Last 14 days'}
              {timeRange === 'thisMonth' && 'This month'}
              {timeRange === 'last30days' && 'Last 30 days'}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Completed</p>
            <p className="text-xl font-bold text-green-600 dark:text-green-400">{bookingStats.completedBookings}</p>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              Success
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">No-Shows</p>
            <p className="text-xl font-bold text-orange-600 dark:text-orange-400">{bookingStats.noShowBookings}</p>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {bookingStats.noShowRate.toFixed(1)}% rate
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Conversions</p>
            <p className="text-xl font-bold text-primary">{bookingStats.convertedBookings}</p>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Target className="w-3 h-3" />
              {bookingStats.conversionRate.toFixed(1)}% rate
            </p>
          </div>
        </div>

        {bookingStats.totalConversionRevenue > 0 && (
          <div className="mb-6 p-4 bg-primary/5 border border-primary/20 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">
                  Conversion Revenue (
                  {timeRange === 'last7days' && 'Last 7 days'}
                  {timeRange === 'last14days' && 'Last 14 days'}
                  {timeRange === 'thisMonth' && 'This month'}
                  {timeRange === 'last30days' && 'Last 30 days'})
                </p>
                <p className="text-2xl font-bold text-primary">£{bookingStats.totalConversionRevenue.toLocaleString()}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-primary opacity-50" />
            </div>
          </div>
        )}

        <div className="space-y-6">
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-primary flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Phone className="w-4 h-4" />
                Calls on this day
              </span>
              {selectedDayCalls.length > 0 && (
                <span className="text-xs font-normal text-muted-foreground">
                  ({selectedDayCalls.length} total)
                </span>
              )}
            </h4>
            {selectedDayCalls.length === 0 ? (
              <div className="border border-dashed border-border rounded-lg p-8 text-center">
                <Phone className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-50" />
                <p className="text-sm text-muted-foreground">
                  No calls scheduled for this day
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {selectedDayCalls.map((call) => (
                  <div
                    key={call.id}
                    className="border border-border rounded-lg p-4 hover:bg-muted/30 transition-all duration-300"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <span className="font-semibold text-foreground flex items-center gap-1.5">
                            <User className="w-4 h-4 flex-shrink-0" />
                            <span className="truncate">{call.clientName}</span>
                          </span>
                          <Badge className={getCallTypeColor(call.callType)}>
                            {call.callType}
                          </Badge>
                          {call.isConverted && (
                            <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                              Converted
                            </Badge>
                          )}
                        </div>
                        <div className="space-y-1.5 text-sm text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <Clock className="w-3.5 h-3.5 flex-shrink-0" />
                            <span>{call.time} ({call.duration} min)</span>
                          </div>
                          {call.isConverted && call.conversionAmount && (
                            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-medium">
                              <DollarSign className="w-3.5 h-3.5 flex-shrink-0" />
                              <span>£{call.conversionAmount.toLocaleString()} revenue</span>
                            </div>
                          )}
                          {call.phone && (
                            <div className="flex items-center gap-2">
                              <Phone className="w-3.5 h-3.5 flex-shrink-0" />
                              <span className="truncate">{call.phone}</span>
                            </div>
                          )}
                          {call.email && (
                            <div className="flex items-center gap-2">
                              <Mail className="w-3.5 h-3.5 flex-shrink-0" />
                              <span className="truncate">{call.email}</span>
                            </div>
                          )}
                        </div>
                        {call.notes && (
                          <p className="text-sm text-muted-foreground mt-2 italic line-clamp-2">
                            {call.notes}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <Badge className={getStatusColor(call.status)} variant="outline">
                          <span className="flex items-center gap-1">
                            {getStatusIcon(call.status)}
                            {call.status}
                          </span>
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {upcomingCalls.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-muted-foreground">
                Next Upcoming
              </h4>
              <div className="space-y-3">
                {upcomingCalls.map((call) => (
                  <div
                    key={call.id}
                    className="border border-border rounded-lg p-3 hover:bg-muted/20 transition-all duration-300 opacity-75"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                          <span className="font-medium text-foreground text-sm flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 flex-shrink-0" />
                            <span className="truncate">{call.clientName}</span>
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(call.date).toLocaleDateString()}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {call.time}
                          </span>
                        </div>
                      </div>
                      <Badge className={`${getCallTypeColor(call.callType)} text-xs`}>
                        {call.callType}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
