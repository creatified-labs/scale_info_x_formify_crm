"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  isToday,
  isBefore,
  startOfDay,
  setHours,
  setMinutes,
  addMinutes,
  addHours,
} from "date-fns";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

interface TimeSlot {
  start: Date;
  end: Date;
  displayTime: string;
}

interface BookingCalendarProps {
  form: {
    schedule_duration?: number;
    schedule_buffer?: number;
    available_days?: string[];
    available_hours?: { start: string; end: string };
    enable_scheduling?: boolean;
    duration_minutes?: number;
    buffer_before?: number;
    buffer_after?: number;
    min_notice_hours?: number;
    time_increment?: number;
    id?: string;
    user_id?: string;
    use_custom_availability?: boolean;
    email?: string;
    slug?: string;
    product?: string | null;
  };
  onTimeSelect?: (time: string) => void;
  onDateSelect?: (date: Date) => void;
  selectedDate?: Date | null;
  selectedTime?: string | null;
  renderCalendar?: boolean;
  renderTimesColumn?: boolean;
}

export const BookingCalendar = ({ 
  form, 
  onTimeSelect, 
  onDateSelect,
  selectedDate, 
  selectedTime,
  renderCalendar = true,
  renderTimesColumn = true
}: BookingCalendarProps) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [hoveredDate, setHoveredDate] = useState<Date | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [availabilityRules, setAvailabilityRules] = useState<any[]>([]);
  const [blockedDates, setBlockedDates] = useState<string[]>([]);
  const [customAvailabilityRules, setCustomAvailabilityRules] = useState<any[]>([]);
  const [timeBlocks, setTimeBlocks] = useState<any[]>([]);
  const [availableSlotsByDate, setAvailableSlotsByDate] = useState<Record<string, TimeSlot[]>>({});
  const [prefetchedRange, setPrefetchedRange] = useState<{ start: string; end: string } | null>(null);
  const [googleSyncEnabled, setGoogleSyncEnabled] = useState(false);
  const isEmailValid = useMemo(() => {
    const trimmed = typeof form.email === "string" ? form.email.trim() : "";
    if (!trimmed) return false;
    return trimmed.includes("@");
  }, [form.email]);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const startDay = monthStart.getDay();
  
  // Load availability rules and blocked dates
  useEffect(() => {
    if (form.user_id) {
      loadAvailabilitySettings();
    }
  }, [form.user_id, form.id, form.use_custom_availability, currentMonth]);

  useEffect(() => {
    if (!isEmailValid) {
      setTimeSlots([]);
      setLoadingSlots(false);
    }
  }, [isEmailValid]);

  // Check Google Calendar integration status
  useEffect(() => {
    const checkGoogleIntegration = async () => {
      if (!form.user_id) return;
      const { data } = await supabase
        .from("user_integrations")
        .select("id")
        .eq("user_id", form.user_id)
        .eq("provider", "google")
        .maybeSingle();
      setGoogleSyncEnabled(!!data);
    };
    checkGoogleIntegration();
  }, [form.user_id]);

  // Fetch time slots when a date is selected
  useEffect(() => {
    if (selectedDate && renderTimesColumn) {
      const key = format(selectedDate, 'yyyy-MM-dd');
      const cached = availableSlotsByDate[key];
      if (cached?.length) {
        setTimeSlots(cached);
      }
      if (isEmailValid) {
        fetchTimeSlots(selectedDate);
      } else {
        setTimeSlots([]);
      }
    }
  }, [selectedDate, renderTimesColumn, availabilityRules, customAvailabilityRules, timeBlocks, isEmailValid]);

  const loadAvailabilitySettings = async () => {
    const monthStartIso = startOfMonth(currentMonth).toISOString();
    const monthEndIso = endOfMonth(currentMonth).toISOString();

    if (!form.user_id) {
      return;
    }

    const { data: session } = await supabase.auth.getSession();
    const isAuthed = Boolean(session?.session);

    if (isAuthed) {
      const { data: globalRules } = await supabase
        .from("availability_rules")
        .select("*")
        .eq("user_id", form.user_id);

      if (globalRules) {
        setAvailabilityRules(globalRules);
      }

      if (form.use_custom_availability && form.id) {
        const { data: customRules } = await supabase
          .from("event_availability_rules")
          .select("*")
          .eq("event_type_id", form.id);

        if (customRules) {
          setCustomAvailabilityRules(customRules);
        }
      }

      const { data: overrides } = await supabase
        .from("availability_overrides")
        .select("date")
        .eq("user_id", form.user_id)
        .eq("is_available", false)
        .is("event_type_id", null);

      if (overrides) {
        setBlockedDates(overrides.map((o) => o.date));
      }

      let blocksQuery = supabase
        .from("time_blocks")
        .select("*")
        .eq("owner_user_id", form.user_id);

      if (form.id) {
        blocksQuery = blocksQuery.or(
          `scope.eq.global_for_host,and(scope.eq.event_only,event_type_id.eq.${form.id})`
        );
      } else {
        blocksQuery = blocksQuery.eq("scope", "global_for_host");
      }

      const { data: blocks } = await blocksQuery;
      if (blocks) {
        setTimeBlocks(blocks);
      }
    }

    if (form.id) {
      await prefetchAvailabilityRange(monthStartIso, monthEndIso);
    }
  };

  const fetchTimeSlots = async (date: Date) => {
    setLoadingSlots(true);
    setTimeSlots([]);

    if (renderTimesColumn && !isEmailValid) {
      setLoadingSlots(false);
      return;
    }

    try {
      // Prefer server-computed availability when event_type_id present
      if (form.id) {
        const start = new Date(date);
        start.setHours(0,0,0,0);
        const end = new Date(date);
        end.setHours(23,59,59,999);

        const qs = new URLSearchParams({
          event_type_id: String(form.id),
          from: start.toISOString(),
          to: end.toISOString(),
        }).toString();
        const qp = new URLSearchParams({
          event_type_id: String(form.id),
          from: start.toISOString(),
          to: end.toISOString(),
        });
        if (form.slug) {
          qp.set("slug", form.slug);
        }
        if (form.product) {
          qp.set("product", String(form.product));
        }

        let res: Response | null = null;
        try {
          res = await fetch(
            `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/list-availability?${qp.toString()}`,
            {
              method: "GET",
              headers: {
                apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
                Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
              },
            }
          );
        } catch (error) {
          if (process.env.NODE_ENV === 'development') {
            console.debug("list-availability fetch failed", error);
          }
          res = null;
        }

        if (res?.status === 401) {
          if (process.env.NODE_ENV === 'development') {
            console.debug("list-availability skipped: missing auth");
          }
          res = null;
        }

        if (res?.ok) {
          const data = await res.json().catch(() => ({ slots: [] }));
          const slots = (data.slots || []).map((s: any) => ({
            start: new Date(s.start_time),
            end: new Date(s.end_time),
            displayTime: format(new Date(s.start_time), 'h:mm a'),
          }));
          const key = format(date, 'yyyy-MM-dd');
          setAvailableSlotsByDate((prev) => ({ ...prev, [key]: slots }));
          setTimeSlots(slots);
          return;
        }
      }

      const fallbackKey = format(date, 'yyyy-MM-dd');
      const cached = availableSlotsByDate[fallbackKey];
      setTimeSlots(cached ?? []);
    } catch (error) {
      console.error('Error generating time slots:', error);
      const key = format(date, 'yyyy-MM-dd');
      const cached = availableSlotsByDate[key];
      if (cached?.length) {
        setTimeSlots(cached);
      }
    } finally {
      setLoadingSlots(false);
    }
  };

  const prefetchAvailabilityRange = async (startIso: string, endIso: string) => {
    if (!form.id) return;
    if (prefetchedRange && prefetchedRange.start === startIso && prefetchedRange.end === endIso) {
      return;
    }

    try {
      const qs = new URLSearchParams({
        event_type_id: String(form.id),
        from: startIso,
        to: endIso,
      }).toString();
      const qp = new URLSearchParams({
        event_type_id: String(form.id),
        from: startIso,
        to: endIso,
      });
      if (form.slug) {
        qp.set("slug", form.slug);
      }
      if (form.product) {
        qp.set("product", String(form.product));
      }

      let res: Response | null = null;
      try {
        res = await fetch(
          `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/list-availability?${qp.toString()}`,
          {
            method: "GET",
            headers: {
              apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
              Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}`,
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
          }
        );
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.debug("prefetch list-availability failed", error);
        }
        res = null;
      }

      if (res?.status === 401) {
        if (process.env.NODE_ENV === 'development') {
          console.debug("prefetch list-availability skipped: missing auth");
        }
        res = null;
      }

      if (!res?.ok) return;

      const data = await res.json().catch(() => ({ slots: [] }));
      const grouped: Record<string, TimeSlot[]> = {};
      for (const slot of data.slots || []) {
        const dateKey = slot.start_time.slice(0, 10);
        if (!grouped[dateKey]) grouped[dateKey] = [];
        grouped[dateKey].push({
          start: new Date(slot.start_time),
          end: new Date(slot.end_time),
          displayTime: format(new Date(slot.start_time), 'h:mm a'),
        });
      }

      setAvailableSlotsByDate((prev) => ({ ...prev, ...grouped }));
      setPrefetchedRange({ start: startIso, end: endIso });
    } catch (error) {
      console.error('Prefetch availability failed', error);
    }
  };

  const isDayAvailable = (date: Date) => {
    const key = format(date, 'yyyy-MM-dd');
    if (availableSlotsByDate[key]?.length) {
      return true;
    }
    // Check if date is in the past
    if (isBefore(date, startOfDay(new Date()))) {
      return false;
    }
    
    // Check minimum notice
    const minNoticeHours = form.min_notice_hours || 24;
    const minDate = addHours(new Date(), minNoticeHours);
    if (isBefore(date, startOfDay(minDate))) {
      return false;
    }

    // Check if date is blocked
    const dateString = format(date, 'yyyy-MM-dd');
    if (blockedDates.includes(dateString)) {
      return false;
    }
    
    // Check if there are availability rules for this day
    const dayOfWeek = date.getDay();
    const rulesToUse = form.use_custom_availability && customAvailabilityRules.length > 0 
      ? customAvailabilityRules 
      : availabilityRules;

    const hasRulesForDay = rulesToUse.some(rule => rule.weekday === dayOfWeek);

    if (hasRulesForDay) {
      return true;
    }

    // Fallback: if no explicit rules exist, allow standard weekday availability so
    // invitees can still pick dates while the server applies default hours.
    const usingFallbackSchedule = (!form.use_custom_availability || rulesToUse.length === 0) && customAvailabilityRules.length === 0 && availabilityRules.length === 0;
    if (usingFallbackSchedule) {
      return [1, 2, 3, 4, 5].includes(dayOfWeek);
    }

    return false;
  };

  const calendarDays = [];
  for (let i = 0; i < startDay; i++) {
    calendarDays.push(null);
  }
  calendarDays.push(...daysInMonth);

  return (
    <>
      {/* Combined view for backward compatibility */}
      {renderCalendar && renderTimesColumn && (
        <div className="space-y-6">
          {/* Calendar Section */}
          <div className="space-y-4 px-4">
            <div className="flex items-center justify-start gap-2 mb-4">
              <h4 className="text-base font-medium">
                {format(currentMonth, 'MMMM yyyy')}
              </h4>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                  className="h-8 w-8"
                  aria-label="Previous month"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                  className="h-8 w-8"
                  aria-label="Next month"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-7 gap-2 text-center text-xs font-medium text-muted-foreground">
                {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(day => (
                  <div key={day}>{day}</div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((day, index) => {
                  const emptyCell = index < startDay;
                  if (emptyCell || !day) {
                    return <div key={`empty-${index}`} />;
                  }
                  const isAvailable = isDayAvailable(day);
                  const key = format(day, 'yyyy-MM-dd');
                  const isSelected = selectedDate ? isSameDay(selectedDate, day) : false;
                  const isDisabled = !isAvailable;

                  return (
                    <button
                      key={key}
                      disabled={isDisabled}
                      onClick={() => {
                        onDateSelect?.(day);
                        if (renderTimesColumn) {
                          setTimeSlots([]);
                        }
                      }}
                      className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center text-sm transition",
                        isSelected
                          ? "bg-primary text-primary-foreground shadow"
                          : "",
                        isDisabled
                          ? "text-muted-foreground/30 cursor-not-allowed"
                          : "hover:bg-muted cursor-pointer",
                        isToday(day) && !isSelected && "ring-2 ring-primary/50",
                        hoveredDate && isSameDay(day, hoveredDate) && !isSelected && isAvailable && "bg-muted/50"
                      )}
                    >
                      {format(day, 'd')}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Times Section */}
          {selectedDate && (
            <div className="space-y-3">
              <h4 className="font-medium">
                {format(selectedDate, 'EEEE, MMMM d')}
              </h4>
              {googleSyncEnabled && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                  <svg className="w-4 h-4 text-emerald-500" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                  </svg>
                  Synced with Google Calendar
                </div>
              )}
              {loadingSlots ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-sm text-muted-foreground">
                    {googleSyncEnabled ? "Checking Google Calendar availability..." : "Loading available times..."}
                  </span>
                </div>
              ) : timeSlots.length > 0 ? (
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {timeSlots.map((slot, index) => (
                    <button
                      key={`${slot.start.toISOString()}-${index}`}
                      type="button"
                      role="option"
                      aria-selected={selectedTime === slot.displayTime}
                      onClick={() => onTimeSelect && onTimeSelect(slot.displayTime)}
                      className={cn(
                        "w-full px-4 py-3 text-center rounded-md transition-all font-medium",
                        "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
                        selectedTime === slot.displayTime
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted hover:bg-muted/70"
                      )}
                    >
                      {slot.displayTime}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-sm text-muted-foreground">
                    No available times
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Try another date
                  </p>
                </div>
              )}
            </div>
          )}

          {!selectedDate && (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground">
                Select a date to see available times
              </p>
            </div>
          )}
        </div>
      )}

      {/* Separate calendar view */}
      {renderCalendar && !renderTimesColumn && (
        <div className="space-y-4 px-4">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-base font-medium">
              {format(currentMonth, 'MMMM yyyy')}
            </h4>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                className="h-8 w-8"
                aria-label="Previous month"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                className="h-8 w-8"
                aria-label="Next month"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted-foreground">
              <div>Sun</div>
              <div>Mon</div>
              <div>Tue</div>
              <div>Wed</div>
              <div>Thu</div>
              <div>Fri</div>
              <div>Sat</div>
            </div>

            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((day, idx) => {
                if (!day) {
                  return <div key={`empty-${idx}`} className="aspect-square" />;
                }

                const available = isDayAvailable(day);
                const selected = selectedDate && isSameDay(day, selectedDate);
                const today = isToday(day);
                const hovered = hoveredDate && isSameDay(day, hoveredDate);

                return (
                  <button
                    key={day.toISOString()}
                    onClick={() => {
                      if (available && onDateSelect) {
                        onDateSelect(day);
                      }
                    }}
                    onMouseEnter={() => available && setHoveredDate(day)}
                    onMouseLeave={() => setHoveredDate(null)}
                    disabled={!available}
                    type="button"
                    aria-label={`${format(day, 'EEEE, MMMM d, yyyy')}${available ? '' : ' - Not available'}`}
                    aria-pressed={selected || undefined}
                    className={cn(
                      "aspect-square flex items-center justify-center text-sm rounded-md transition-all font-medium",
                      "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
                      available && "hover:bg-muted cursor-pointer",
                      !available && "text-muted-foreground/30 cursor-not-allowed",
                      selected && "bg-primary text-primary-foreground hover:bg-primary/90",
                      today && !selected && "ring-2 ring-primary/50",
                      hovered && !selected && available && "bg-muted/50"
                    )}
                  >
                    {format(day, 'd')}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Separate times view */}
      {!renderCalendar && renderTimesColumn && (
        <>
          {selectedDate ? (
            <div className="h-full flex flex-col">
              {loadingSlots ? (
                <div className="flex-1 flex items-center justify-center p-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : timeSlots.length > 0 ? (
                <div className="flex-1 p-6 space-y-2">
                  {timeSlots.map((slot, index) => (
                    <button
                      key={`${slot.start.toISOString()}-${index}`}
                      type="button"
                      role="option"
                      aria-selected={selectedTime === slot.displayTime}
                      onClick={() => onTimeSelect && onTimeSelect(slot.displayTime)}
                      className={cn(
                        "w-full px-4 py-3 text-center rounded-md transition-all font-medium",
                        "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
                        selectedTime === slot.displayTime
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted hover:bg-muted/70"
                      )}
                    >
                      {slot.displayTime}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center p-8">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">
                      No available times
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Try another date
                    </p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center p-8">
              <p className="text-sm text-muted-foreground text-center">
                Select a date from the calendar to see available times
              </p>
            </div>
          )}
        </>
      )}
    </>
  );
};
