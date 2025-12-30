"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { IntegrationsSettings } from "@/components/scheduling/IntegrationsSettings";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { getCompanyId } from "@/lib/company";

const TIMEZONES = [
  { value: "America/New_York", label: "Eastern Time (ET)" },
  { value: "America/Chicago", label: "Central Time (CT)" },
  { value: "America/Denver", label: "Mountain Time (MT)" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
  { value: "America/Phoenix", label: "Arizona (MST)" },
  { value: "America/Anchorage", label: "Alaska Time (AKT)" },
  { value: "Pacific/Honolulu", label: "Hawaii Time (HST)" },
  { value: "Europe/London", label: "London (GMT/BST)" },
  { value: "Europe/Paris", label: "Paris (CET/CEST)" },
  { value: "Asia/Tokyo", label: "Tokyo (JST)" },
  { value: "Australia/Sydney", label: "Sydney (AEDT/AEST)" },
  { value: "UTC", label: "UTC" },
];

export default function AccountSettingsPage() {
  const { toast } = useToast();
  const [userTimezone, setUserTimezone] = useState("America/New_York");
  const [timezoneSaving, setTimezoneSaving] = useState(false);
  
  // Google Calendar Integration Settings
  const [autoAddToCalendar, setAutoAddToCalendar] = useState(true);
  const [checkCalendarConflicts, setCheckCalendarConflicts] = useState(true);
  const [autoCreateMeetLinks, setAutoCreateMeetLinks] = useState(true);
  const [syncExistingEvents, setSyncExistingEvents] = useState(false);
  const [calendarSyncInterval, setCalendarSyncInterval] = useState("realtime");
  const [integrationSettingsSaving, setIntegrationSettingsSaving] = useState(false);
  
  // Calendar Selection
  const [availableCalendars, setAvailableCalendars] = useState<Array<{ id: string; summary: string; primary?: boolean }>>([]);
  const [selectedCalendarIds, setSelectedCalendarIds] = useState<string[]>([]);
  const [loadingCalendars, setLoadingCalendars] = useState(false);

  useEffect(() => {
    loadUserTimezone();
    loadIntegrationSettings();
    loadGoogleCalendars();
  }, []);

  const loadUserTimezone = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("profiles")
        .select("timezone")
        .eq("id", user.id)
        .maybeSingle();

      if (!error && data?.timezone) {
        setUserTimezone(data.timezone);
      }
    } catch (error) {
      console.error("Error loading timezone:", error);
    }
  };

  const loadIntegrationSettings = async () => {
    try {
      const companyId = await getCompanyId({ allowFallback: true });
      if (!companyId) return;

      const { data, error } = await supabase
        .from("companies")
        .select("settings")
        .eq("id", companyId)
        .maybeSingle();

      if (!error && data?.settings) {
        const settings = data.settings as any;
        if (settings.google_calendar) {
          setAutoAddToCalendar(settings.google_calendar.auto_add_bookings ?? true);
          setCheckCalendarConflicts(settings.google_calendar.check_conflicts ?? true);
          setAutoCreateMeetLinks(settings.google_calendar.auto_create_meet_links ?? true);
          setSyncExistingEvents(settings.google_calendar.sync_existing_events ?? false);
          setCalendarSyncInterval(settings.google_calendar.sync_interval ?? "realtime");
          setSelectedCalendarIds(settings.google_calendar.selected_calendars ?? []);
        }
      }
    } catch (error) {
      console.warn("Error loading integration settings:", error);
    }
  };

  const loadGoogleCalendars = async () => {
    setLoadingCalendars(true);
    try {
      const companyId = await getCompanyId({ allowFallback: true });
      if (!companyId) return;

      // Get integration account with access token
      const { data: integrationData } = await supabase
        .from("integration_accounts")
        .select("access_token, refresh_token")
        .eq("company_id", companyId)
        .eq("provider", "google_calendar")
        .maybeSingle();

      if (!integrationData?.access_token) {
        setAvailableCalendars([]);
        return;
      }

      // Fetch calendar list from Google
      const response = await fetch("https://www.googleapis.com/calendar/v3/users/me/calendarList", {
        headers: {
          Authorization: `Bearer ${integrationData.access_token}`,
        },
      });

      if (!response.ok) {
        console.warn("Failed to fetch calendars:", response.statusText);
        return;
      }

      const data = await response.json();
      const calendars = data.items?.map((cal: any) => ({
        id: cal.id,
        summary: cal.summary || cal.id,
        primary: cal.primary || false,
      })) || [];

      setAvailableCalendars(calendars);

      // Auto-select primary calendar if no calendars selected yet
      if (selectedCalendarIds.length === 0 && calendars.length > 0) {
        const primaryCal = calendars.find((c: any) => c.primary);
        if (primaryCal) {
          setSelectedCalendarIds([primaryCal.id]);
        }
      }
    } catch (error) {
      console.warn("Error loading Google calendars:", error);
    } finally {
      setLoadingCalendars(false);
    }
  };

  const handleTimezoneSave = async () => {
    setTimezoneSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({ title: "Error", description: "No user session found", variant: "destructive" });
        return;
      }

      const { error } = await supabase
        .from("profiles")
        .upsert({ id: user.id, timezone: userTimezone }, { onConflict: "id" });

      if (error) throw error;

      toast({ title: "Saved", description: "Timezone preference updated" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setTimezoneSaving(false);
    }
  };

  const handleIntegrationSettingsSave = async () => {
    setIntegrationSettingsSaving(true);
    try {
      const companyId = await getCompanyId({ allowFallback: true });
      if (!companyId) {
        toast({ title: "Error", description: "No company found", variant: "destructive" });
        return;
      }

      const settings = {
        google_calendar: {
          auto_add_bookings: autoAddToCalendar,
          check_conflicts: checkCalendarConflicts,
          auto_create_meet_links: autoCreateMeetLinks,
          sync_existing_events: syncExistingEvents,
          sync_interval: calendarSyncInterval,
          selected_calendars: selectedCalendarIds,
        },
      };

      const { error } = await supabase
        .from("companies")
        .update({ settings })
        .eq("id", companyId);

      if (error) throw error;

      toast({ title: "Saved", description: "Integration settings updated" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIntegrationSettingsSaving(false);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Account Settings</h1>
        <p className="text-muted-foreground mt-2">
          Manage your account preferences, integrations, and calendar settings
        </p>
      </div>

      {/* Timezone Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Timezone</CardTitle>
          <CardDescription>
            Select your preferred timezone for displaying dates and times
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="timezone-select">Timezone</Label>
            <Select value={userTimezone} onValueChange={setUserTimezone}>
              <SelectTrigger id="timezone-select">
                <SelectValue placeholder="Select a timezone" />
              </SelectTrigger>
              <SelectContent>
                {TIMEZONES.map((tz) => (
                  <SelectItem key={tz.value} value={tz.value}>
                    {tz.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Current time: {new Date().toLocaleString("en-US", {
                timeZone: userTimezone,
                timeStyle: "short",
              })}
            </p>
          </div>
          <div className="flex justify-end">
            <Button onClick={handleTimezoneSave} disabled={timezoneSaving}>
              {timezoneSaving ? "Saving..." : "Save timezone"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Google Calendar Integration */}
      <Card>
        <CardHeader>
          <CardTitle>Google Calendar Integration</CardTitle>
          <CardDescription>
            Connect your Google Calendar and configure sync preferences
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <IntegrationsSettings />

          <div className="border-t pt-6 space-y-4">
            <h3 className="text-sm font-semibold">Calendar Sync Settings</h3>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="auto-add">Automatically add bookings to calendar</Label>
                <p className="text-xs text-muted-foreground">
                  New bookings will be automatically added to your Google Calendar
                </p>
              </div>
              <Switch
                id="auto-add"
                checked={autoAddToCalendar}
                onCheckedChange={setAutoAddToCalendar}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="check-conflicts">Check calendar for conflicts</Label>
                <p className="text-xs text-muted-foreground">
                  Prevent double-bookings by checking your calendar in real-time
                </p>
              </div>
              <Switch
                id="check-conflicts"
                checked={checkCalendarConflicts}
                onCheckedChange={setCheckCalendarConflicts}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="auto-meet">Auto-create Google Meet links</Label>
                <p className="text-xs text-muted-foreground">
                  Automatically generate Google Meet links for all bookings
                </p>
              </div>
              <Switch
                id="auto-meet"
                checked={autoCreateMeetLinks}
                onCheckedChange={setAutoCreateMeetLinks}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="sync-existing">Sync existing calendar events</Label>
                <p className="text-xs text-muted-foreground">
                  Block times for existing events in your Google Calendar
                </p>
              </div>
              <Switch
                id="sync-existing"
                checked={syncExistingEvents}
                onCheckedChange={setSyncExistingEvents}
              />
            </div>

            <div className="space-y-3">
              <div>
                <Label>Calendars to check for conflicts</Label>
                <p className="text-xs text-muted-foreground mb-3">
                  Select which calendars to check when preventing double-bookings
                </p>
              </div>
              
              {loadingCalendars ? (
                <p className="text-sm text-muted-foreground">Loading calendars...</p>
              ) : availableCalendars.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Connect your Google Calendar to select calendars
                </p>
              ) : (
                <div className="space-y-2 border rounded-lg p-3">
                  {availableCalendars.map((calendar) => (
                    <div key={calendar.id} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={`calendar-${calendar.id}`}
                        checked={selectedCalendarIds.includes(calendar.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedCalendarIds([...selectedCalendarIds, calendar.id]);
                          } else {
                            setSelectedCalendarIds(selectedCalendarIds.filter(id => id !== calendar.id));
                          }
                        }}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                      <label
                        htmlFor={`calendar-${calendar.id}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        {calendar.summary}
                        {calendar.primary && (
                          <span className="ml-2 text-xs text-muted-foreground">(Primary)</span>
                        )}
                      </label>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="sync-interval">Calendar sync frequency</Label>
              <Select value={calendarSyncInterval} onValueChange={setCalendarSyncInterval}>
                <SelectTrigger id="sync-interval">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="realtime">Real-time (recommended)</SelectItem>
                  <SelectItem value="5min">Every 5 minutes</SelectItem>
                  <SelectItem value="15min">Every 15 minutes</SelectItem>
                  <SelectItem value="30min">Every 30 minutes</SelectItem>
                  <SelectItem value="1hour">Every hour</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                How often to check your calendar for updates
              </p>
            </div>

            <div className="flex justify-end pt-4">
              <Button onClick={handleIntegrationSettingsSave} disabled={integrationSettingsSaving}>
                {integrationSettingsSaving ? "Saving..." : "Save integration settings"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
