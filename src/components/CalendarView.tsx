"use client";

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { ChevronLeft, ChevronRight, Calendar, Clock, User, FileText, Phone, CheckCircle, PoundSterling } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { getCompanyId } from '@/lib/company';
import { Booking } from '@/types/scheduling';
import {
  format,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  addWeeks,
  subWeeks,
  addMonths,
  subMonths,
  isToday,
  isSameDay,
} from 'date-fns';

type CalendarEvent = {
  id: string;
  clientName: string;
  eventName?: string;
  date: string;
  time: string;
  duration: number;
  status: string;
  callType: string;
  isConverted?: boolean;
  conversionAmount?: number;
  notes?: string;
  email?: string;
  phone?: string;
  joinUrl?: string;
  answers?: Record<string, any>;
};

const CalendarView = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesValue, setNotesValue] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const { toast } = useToast();

  const periodStart =
    viewMode === 'week'
      ? startOfWeek(currentDate, { weekStartsOn: 1 })
      : startOfMonth(currentDate);
  const periodEnd =
    viewMode === 'week'
      ? endOfWeek(currentDate, { weekStartsOn: 1 })
      : endOfMonth(currentDate);
  const periodDays = eachDayOfInterval({ start: periodStart, end: periodEnd });

  const loadBookings = useCallback(async () => {
    setLoading(true);
    const companyId = await getCompanyId({ allowFallback: false });
    if (!companyId) {
      setBookings([]);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('bookings')
      .select('*, event_types(*)')
      .eq('company_id', companyId)
      .order('start_time', { ascending: false });

    if (!error && data) {
      setBookings(data as any);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  useEffect(() => {
    const handler = () => {
      loadBookings();
    };
    window.addEventListener('bookings-refresh', handler);
    window.addEventListener('call-tracker-refresh', handler);
    return () => {
      window.removeEventListener('bookings-refresh', handler);
      window.removeEventListener('call-tracker-refresh', handler);
    };
  }, [loadBookings]);

  // Convert bookings to calendar events
  const events: CalendarEvent[] = bookings.map((booking) => {
    const start = new Date(booking.start_time);
    const end = new Date(booking.end_time);
    const duration = Math.round((end.getTime() - start.getTime()) / 60000);
    
    return {
      id: booking.id,
      clientName: booking.invitee_name,
      eventName: (booking as any).event_types?.name,
      date: format(start, 'yyyy-MM-dd'),
      time: format(start, 'HH:mm'),
      duration,
      status: booking.status,
      callType: booking.chosen_call_type || 'meeting',
      isConverted: (booking as any).is_converted,
      conversionAmount: (booking as any).conversion_amount,
      notes: (booking as any).notes,
      email: booking.invitee_email,
      phone: booking.invitee_phone,
      joinUrl: booking.video_join_url || undefined,
      answers: booking.answers as Record<string, any> | undefined,
    };
  });

  // Filter events for the visible period (week or month)
  const periodEvents = events.filter((event) => {
    const eventDate = new Date(event.date);
    return eventDate >= periodStart && eventDate <= periodEnd;
  });

  // Group events by day
  const eventsByDay: Record<string, CalendarEvent[]> = {};
  periodDays.forEach((day) => {
    const dayKey = format(day, 'yyyy-MM-dd');
    eventsByDay[dayKey] = periodEvents.filter((event) => event.date === dayKey);
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'scheduled': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      case 'no-show': return 'bg-orange-100 text-orange-800 border-orange-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getCallTypeIcon = (type: string) => {
    switch (type) {
      case 'call': return <Phone className="w-3 h-3" />;
      case 'meeting': return <Calendar className="w-3 h-3" />;
      case 'consultation': return <Calendar className="w-3 h-3" />;
      default: return <Phone className="w-3 h-3" />;
    }
  };

  const previousPeriod = () => {
    setCurrentDate((current) =>
      viewMode === 'week' ? subWeeks(current, 1) : subMonths(current, 1),
    );
  };

  const nextPeriod = () => {
    setCurrentDate((current) =>
      viewMode === 'week' ? addWeeks(current, 1) : addMonths(current, 1),
    );
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              {viewMode === 'week' ? 'Weekly Call Calendar' : 'Monthly Call Calendar'}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={previousPeriod}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={goToToday}>
                Today
              </Button>
              <Button variant="outline" size="sm" onClick={nextPeriod}>
                <ChevronRight className="w-4 h-4" />
              </Button>
              <div className="ml-2 inline-flex rounded-md border bg-background">
                <Button
                  variant={viewMode === 'week' ? 'default' : 'ghost'}
                  size="sm"
                  className="px-3 rounded-r-none"
                  onClick={() => setViewMode('week')}
                >
                  Week
                </Button>
                <Button
                  variant={viewMode === 'month' ? 'default' : 'ghost'}
                  size="sm"
                  className="px-3 rounded-l-none"
                  onClick={() => setViewMode('month')}
                >
                  Month
                </Button>
              </div>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            {viewMode === 'week'
              ? `${format(periodStart, 'MMM d')} - ${format(periodEnd, 'MMM d, yyyy')}`
              : format(periodStart, 'MMMM yyyy')}
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-2">
            {periodDays.map((day, index) => {
              const dayKey = format(day, 'yyyy-MM-dd');
              const dayEvents = eventsByDay[dayKey] || [];
              const dayEventsSorted = dayEvents.sort((a, b) => (a.time || '').localeCompare(b.time || ''));
              
              return (
                <div key={index} className="min-h-[120px]">
                  <div className={`p-2 border rounded-lg ${isToday(day) ? 'bg-primary/5 border-primary/20' : 'bg-card'}`}>
                    <div className="text-sm font-medium mb-2 text-center">
                      <div>{format(day, 'EEE')}</div>
                      <div className={`text-lg ${isToday(day) ? 'text-primary font-bold' : ''}`}>
                        {format(day, 'd')}
                      </div>
                    </div>
                    
                    <div className="space-y-1">
                      {dayEventsSorted.map((event) => (
                        <Dialog key={event.id}>
                          <DialogTrigger asChild>
                            <div
                              className={`text-xs p-1 rounded border cursor-pointer hover:opacity-80 transition-opacity ${getStatusColor(event.status)}`}
                              onClick={() => setSelectedEvent(event)}
                            >
                              <div className="flex items-center gap-1 mb-1">
                                {getCallTypeIcon(event.callType)}
                                <span className="font-medium truncate">{event.clientName}</span>
                              </div>
                              <div className="flex items-center gap-1 text-xs opacity-75">
                                <Clock className="w-2 h-2" />
                                <span>{event.time}</span>
                                {event.isConverted && (
                                  <PoundSterling className="w-2 h-2 text-green-600" />
                                )}
                              </div>
                            </div>
                          </DialogTrigger>
                          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
                            <DialogHeader className="space-y-3 pr-8">
                              <div className="space-y-3">
                                <div className="flex items-start justify-between gap-4">
                                  <DialogTitle className="text-2xl font-semibold">{event.clientName}</DialogTitle>
                                  <Badge className={getStatusColor(event.status)}>
                                    {event.status === 'completed' && <CheckCircle className="w-3 h-3 mr-1" />}
                                    <span className="capitalize">{event.status}</span>
                                  </Badge>
                                </div>
                                {event.eventName && (
                                  <div className="text-base font-medium text-muted-foreground">
                                    {event.eventName}
                                  </div>
                                )}
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  {getCallTypeIcon(event.callType)}
                                  <span className="capitalize">{event.callType.replace('_', ' ')}</span>
                                </div>
                              </div>
                            </DialogHeader>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-4">
                              {/* Left Column - Main Details */}
                              <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-3">
                                  <div className="space-y-1 rounded-lg border bg-muted/30 p-3">
                                    <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                      <Calendar className="w-3.5 h-3.5" />
                                      Date
                                    </div>
                                    <p className="text-sm font-medium">{format(new Date(event.date), 'MMM d, yyyy')}</p>
                                  </div>
                                  <div className="space-y-1 rounded-lg border bg-muted/30 p-3">
                                    <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                      <Clock className="w-3.5 h-3.5" />
                                      Time
                                    </div>
                                    <p className="text-sm font-medium">{event.time} ({event.duration} min)</p>
                                  </div>
                                </div>

                                {event.email && (
                                  <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
                                    <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                      <User className="w-3.5 h-3.5" />
                                      Contact
                                    </div>
                                    <p className="text-sm font-medium break-all">{event.email}</p>
                                    {event.phone && (
                                      <p className="text-sm text-muted-foreground">{event.phone}</p>
                                    )}
                                  </div>
                                )}

                                {event.joinUrl && (
                                  <div className="space-y-2 rounded-lg border bg-primary/5 border-primary/20 p-3">
                                    <div className="flex items-center gap-2 text-xs font-medium text-primary uppercase tracking-wide">
                                      <Phone className="w-3.5 h-3.5" />
                                      Meeting Link
                                    </div>
                                    <a 
                                      href={event.joinUrl} 
                                      target="_blank" 
                                      rel="noopener noreferrer" 
                                      className="text-sm font-medium text-primary hover:underline break-all block"
                                    >
                                      {event.joinUrl}
                                    </a>
                                    <Button 
                                      size="sm" 
                                      className="w-full mt-2"
                                      onClick={() => window.open(event.joinUrl, '_blank')}
                                    >
                                      Join Meeting
                                    </Button>
                                  </div>
                                )}

                                {event.isConverted && (
                                  <div className="space-y-2 rounded-lg border bg-green-50 border-green-200 p-3">
                                    <div className="flex items-center gap-2 text-xs font-medium text-green-700 uppercase tracking-wide">
                                      <PoundSterling className="w-3.5 h-3.5" />
                                      Converted
                                    </div>
                                    <p className="text-lg font-semibold text-green-700">
                                      £{event.conversionAmount?.toLocaleString()}
                                    </p>
                                  </div>
                                )}

                                {event.answers && Object.keys(event.answers).length > 0 && (
                                  <div className="space-y-3 rounded-lg border bg-muted/30 p-3">
                                    <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                      <FileText className="w-3.5 h-3.5" />
                                      Invitee Responses
                                    </div>
                                    <div className="space-y-3">
                                      {Object.entries(event.answers).map(([key, value]) => (
                                        <div key={key} className="space-y-1">
                                          <p className="text-xs font-medium text-muted-foreground capitalize">{key.replace(/_/g, ' ')}</p>
                                          <p className="text-sm leading-relaxed">
                                            {Array.isArray(value) ? value.join(', ') : String(value)}
                                          </p>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>

                              {/* Right Column - Notes */}
                              <div className="space-y-4">
                                <div className="space-y-2 rounded-lg border bg-muted/30 p-3 h-full">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                      <FileText className="w-3.5 h-3.5" />
                                      Notes
                                    </div>
                                    {!editingNotes ? (
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => {
                                          setEditingNotes(true);
                                          setNotesValue(event.notes || '');
                                        }}
                                      >
                                        Edit
                                      </Button>
                                    ) : (
                                      <div className="flex gap-2">
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          onClick={() => {
                                            setEditingNotes(false);
                                            setNotesValue('');
                                          }}
                                          disabled={savingNotes}
                                        >
                                          Cancel
                                        </Button>
                                        <Button
                                          size="sm"
                                          onClick={async () => {
                                            setSavingNotes(true);
                                            try {
                                              const { error } = await supabase
                                                .from('bookings')
                                                .update({ notes: notesValue })
                                                .eq('id', event.id);

                                              if (error) throw error;

                                              toast({ title: 'Notes saved successfully' });
                                              setEditingNotes(false);
                                              loadBookings();
                                            } catch (error: any) {
                                              toast({
                                                title: 'Error saving notes',
                                                description: error.message,
                                                variant: 'destructive',
                                              });
                                            } finally {
                                              setSavingNotes(false);
                                            }
                                          }}
                                          disabled={savingNotes}
                                        >
                                          {savingNotes ? 'Saving...' : 'Save'}
                                        </Button>
                                      </div>
                                    )}
                                  </div>
                                  {editingNotes ? (
                                    <Textarea
                                      value={notesValue}
                                      onChange={(e) => setNotesValue(e.target.value)}
                                      placeholder="Add notes about this booking..."
                                      className="min-h-[300px] text-sm"
                                    />
                                  ) : (
                                    <div className="min-h-[300px]">
                                      {event.notes ? (
                                        <p className="text-sm whitespace-pre-wrap leading-relaxed">{event.notes}</p>
                                      ) : (
                                        <p className="text-sm text-muted-foreground italic">No notes added. Click Edit to add notes.</p>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CalendarView;