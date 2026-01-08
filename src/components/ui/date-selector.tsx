"use client";

import * as React from "react";
import { CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  addDays,
  addMonths,
  format,
  isSameDay,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isBefore,
  startOfDay,
  getDay,
  subMonths,
} from "date-fns";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";

interface DateSelectorProps {
  selected?: Date;
  onSelect?: (date: Date | undefined) => void;
  disabled?: (date: Date) => boolean;
  className?: string;
  placeholder?: string;
}

export function DateSelector({
  selected,
  onSelect,
  disabled,
  className,
  placeholder = "Select a date",
}: DateSelectorProps) {
  const [open, setOpen] = React.useState(false);
  const [currentMonth, setCurrentMonth] = React.useState(
    selected || new Date()
  );

  const monthDays = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth),
  });

  const handlePrevMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  const handleSelectDate = (date: Date) => {
    onSelect?.(date);
    setOpen(false);
  };

  const isDisabled = (date: Date) => {
    return disabled ? disabled(date) : false;
  };

  const today = startOfDay(new Date());

  // Quick date shortcuts
  const quickDates = [
    { label: "Today", date: today },
    { label: "Tomorrow", date: addDays(today, 1) },
    { label: "In 3 days", date: addDays(today, 3) },
    { label: "In 1 week", date: addDays(today, 7) },
    { label: "In 2 weeks", date: addDays(today, 14) },
    { label: "In 1 month", date: addMonths(today, 1) },
  ];

  // Get starting padding for first day of month
  const firstDayOfMonth = getDay(startOfMonth(currentMonth));
  const paddingDays = Array(firstDayOfMonth).fill(null);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal h-11 border-2 hover:border-primary/50 transition-colors",
            !selected && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4 flex-shrink-0" />
          {selected ? format(selected, "PPPP") : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start" side="bottom">
        <div className="flex flex-col sm:flex-row">
          {/* Quick Select Sidebar */}
          <div className="border-b sm:border-b-0 sm:border-r border-border bg-muted/30 p-3">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Quick Select
            </div>
            <div className="space-y-1 min-w-[120px]">
              {quickDates.map((quick) => {
                const isSelectedDate = selected && isSameDay(quick.date, selected);
                const isDateDisabled = isDisabled(quick.date);

                return (
                  <Button
                    key={quick.label}
                    variant="ghost"
                    size="sm"
                    disabled={isDateDisabled}
                    className={cn(
                      "w-full justify-start text-sm font-normal h-8",
                      isSelectedDate && "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
                      isDateDisabled && "opacity-50 cursor-not-allowed"
                    )}
                    onClick={() => !isDateDisabled && handleSelectDate(quick.date)}
                  >
                    {quick.label}
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="p-3">
            {/* Month Navigation */}
            <div className="flex items-center justify-between mb-3">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handlePrevMonth}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="text-sm font-semibold">
                {format(currentMonth, "MMMM yyyy")}
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleNextMonth}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Day Headers */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => (
                <div
                  key={day}
                  className="text-xs font-medium text-muted-foreground text-center py-2"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Date Grid */}
            <div className="grid grid-cols-7 gap-1">
              {/* Empty cells for padding */}
              {paddingDays.map((_, index) => (
                <div key={`padding-${index}`} className="h-9" />
              ))}

              {/* Actual dates */}
              {monthDays.map((date) => {
                const isSelectedDate = selected && isSameDay(date, selected);
                const isToday = isSameDay(date, today);
                const isDateDisabled = isDisabled(date);

                return (
                  <Button
                    key={date.toString()}
                    variant="ghost"
                    size="sm"
                    disabled={isDateDisabled}
                    className={cn(
                      "h-9 w-9 p-0 font-normal rounded-md transition-all",
                      isToday && "border border-primary",
                      isSelectedDate &&
                        "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground font-semibold",
                      !isSelectedDate && !isDateDisabled && "hover:bg-muted",
                      isDateDisabled && "opacity-30 cursor-not-allowed"
                    )}
                    onClick={() => !isDateDisabled && handleSelectDate(date)}
                  >
                    {format(date, "d")}
                  </Button>
                );
              })}
            </div>

            {/* Footer */}
            <div className="mt-3 pt-3 border-t border-border">
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs"
                onClick={() => {
                  onSelect?.(undefined);
                  setOpen(false);
                }}
              >
                Clear selection
              </Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
