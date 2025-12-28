"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

/**
 * Hook to get and manage user's preferred timezone
 * Falls back to browser timezone if not set
 */
export function useTimezone() {
  const { user } = useAuth();
  const [timezone, setTimezone] = useState<string>(() => {
    // Default to browser timezone
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    const loadTimezone = async () => {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("timezone")
          .eq("id", user.id)
          .maybeSingle();

        if (error) {
          console.error("Error loading timezone:", error);
        } else if (data?.timezone) {
          setTimezone(data.timezone);
        }
      } catch (error) {
        console.error("Error loading timezone:", error);
      } finally {
        setLoading(false);
      }
    };

    loadTimezone();
  }, [user?.id]);

  return { timezone, loading };
}

/**
 * Format a date string or Date object in the user's timezone
 */
export function formatInTimezone(
  date: string | Date,
  timezone: string,
  options?: Intl.DateTimeFormatOptions
): string {
  const dateObj = typeof date === "string" ? new Date(date) : date;

  const defaultOptions: Intl.DateTimeFormatOptions = {
    dateStyle: "medium",
    timeStyle: "short",
    ...options,
  };

  try {
    return dateObj.toLocaleString("en-US", {
      ...defaultOptions,
      timeZone: timezone,
    });
  } catch (error) {
    console.error("Error formatting date:", error);
    return dateObj.toLocaleString("en-US", defaultOptions);
  }
}

/**
 * Get the user's current time in their timezone
 */
export function getCurrentTimeInTimezone(timezone: string): string {
  return new Date().toLocaleString("en-US", {
    timeZone: timezone,
    timeStyle: "short",
  });
}

/**
 * Format a date for display (date only, no time)
 */
export function formatDateInTimezone(
  date: string | Date,
  timezone: string
): string {
  return formatInTimezone(date, timezone, {
    dateStyle: "medium",
    timeStyle: undefined,
  });
}

/**
 * Format a time for display (time only, no date)
 */
export function formatTimeInTimezone(
  date: string | Date,
  timezone: string
): string {
  return formatInTimezone(date, timezone, {
    dateStyle: undefined,
    timeStyle: "short",
  });
}
