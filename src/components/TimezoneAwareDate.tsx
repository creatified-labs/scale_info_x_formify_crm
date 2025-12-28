"use client";

import { useTimezone, formatInTimezone } from "@/hooks/use-timezone";

interface TimezoneAwareDateProps {
  date: string | Date;
  format?: "full" | "date" | "time";
  className?: string;
}

/**
 * Component that displays dates in the user's preferred timezone
 * Usage: <TimezoneAwareDate date={booking.start_time} format="full" />
 */
export function TimezoneAwareDate({ date, format = "full", className }: TimezoneAwareDateProps) {
  const { timezone, loading } = useTimezone();

  if (loading) {
    return <span className={className}>Loading...</span>;
  }

  const formatOptions: Record<string, Intl.DateTimeFormatOptions> = {
    full: { dateStyle: "medium", timeStyle: "short" },
    date: { dateStyle: "medium" },
    time: { timeStyle: "short" },
  };

  const formatted = formatInTimezone(date, timezone, formatOptions[format]);

  return <span className={className}>{formatted}</span>;
}
