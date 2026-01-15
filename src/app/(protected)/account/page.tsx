"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { IntegrationsSettings } from "@/components/scheduling/IntegrationsSettings";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { getCompanyId } from "@/lib/company";
import { CURRENCIES } from "@/lib/currency";
import { TIMEZONES } from "@/lib/timezones";

export default function AccountSettingsPage() {
  const { toast } = useToast();
  const [userTimezone, setUserTimezone] = useState("America/New_York");
  const [timezoneSaving, setTimezoneSaving] = useState(false);
  const [currentTime, setCurrentTime] = useState<string>("");

  // Currency Settings
  const [defaultCurrency, setDefaultCurrency] = useState("GBP");
  const [currencySaving, setCurrencySaving] = useState(false);

  // Brand Name Settings
  const [brandingNameInput, setBrandingNameInput] = useState("Scale Info");
  const [bookingPrefix, setBookingPrefix] = useState("");
  const [brandingSaving, setBrandingSaving] = useState(false);

  // Watermark Settings
  const [brandingHideBadge, setBrandingHideBadge] = useState(false);

  // Notification Emails
  const [notificationEmails, setNotificationEmails] = useState<string[]>([]);
  const [newEmail, setNewEmail] = useState("");
  const [emailsSaving, setEmailsSaving] = useState(false);

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
  const [selectedCalendarForEvents, setSelectedCalendarForEvents] = useState<string>("");
  const [loadingCalendars, setLoadingCalendars] = useState(false);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    const initializeSettings = async () => {
      loadUserTimezone();
      loadUserCurrency();
      loadBrandingSettings();
      await loadIntegrationSettings(); // Load settings FIRST
      await loadGoogleCalendars(); // Then load calendars (won't overwrite)
    };
    initializeSettings();
  }, []);

  // Update current time on client-side to prevent hydration mismatch
  useEffect(() => {
    const updateTime = () => {
      setCurrentTime(new Date().toLocaleString("en-US", {
        timeZone: userTimezone,
        timeStyle: "short",
      }));
    };

    updateTime(); // Initial update
    const interval = setInterval(updateTime, 1000); // Update every second

    return () => clearInterval(interval);
  }, [userTimezone]);

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

  const loadUserCurrency = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("profiles")
        .select("default_currency")
        .eq("id", user.id)
        .maybeSingle();

      if (!error && data?.default_currency) {
        setDefaultCurrency(data.default_currency);
      }
    } catch (error) {
      console.error("Error loading currency:", error);
    }
  };

  const handleCurrencySave = async () => {
    setCurrencySaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("profiles")
        .update({ default_currency: defaultCurrency })
        .eq("id", user.id);

      if (error) throw error;

      // Cache in localStorage for instant loading on next page load
      try {
        localStorage.setItem('user_currency', defaultCurrency);
      } catch (err) {
        console.warn('Failed to cache currency in localStorage:', err);
      }

      // Dispatch custom event to notify CurrencyContext to reload immediately
      window.dispatchEvent(new CustomEvent('currency-updated'));

      toast({
        title: "Currency updated",
        description: `Default currency set to ${CURRENCIES.find(c => c.code === defaultCurrency)?.name}`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update currency",
        variant: "destructive",
      });
    } finally {
      setCurrencySaving(false);
    }
  };

  const loadBrandingSettings = async () => {
    try {
      const companyId = await getCompanyId({ allowFallback: true });
      if (!companyId) return;

      const { data: company } = await supabase
        .from("companies")
        .select("branding_name, branding_hide_badge, booking_slug_prefix, notification_emails")
        .eq("id", companyId)
        .maybeSingle();

      if (company) {
        const brandingName = typeof company.branding_name === "string" ? company.branding_name.trim() : "";
        const finalBrandName = brandingName || "Scale Info";

        // If booking slug is "formifycrm" and brand name is "Scale Info", use "scaleinfo" instead
        let finalBookingSlug = company.booking_slug_prefix || "";
        if (finalBookingSlug === "formifycrm" && finalBrandName === "Scale Info") {
          finalBookingSlug = "scaleinfo";
        }

        setBrandingNameInput(finalBrandName);
        setBookingPrefix(finalBookingSlug);
        setBrandingHideBadge(Boolean(company.branding_hide_badge));
        setNotificationEmails(company.notification_emails || []);
      }
    } catch (error) {
      console.error("Error loading branding settings:", error);
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
          setSelectedCalendarForEvents(settings.google_calendar.add_events_to_calendar ?? "");
        }
      }
    } catch (error) {
      console.warn("Error loading integration settings:", error);
    }
  };

  const loadGoogleCalendars = async () => {
    setLoadingCalendars(true);
    try {
      // Get user ID
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get integration from user_integrations table
      const { data: integrationData } = await supabase
        .from("user_integrations")
        .select("access_token, refresh_token")
        .eq("user_id", user.id)
        .eq("provider", "google")
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

      // Check if user has already saved settings in the database
      const companyId = await getCompanyId({ allowFallback: true });
      if (companyId) {
        const { data: company } = await supabase
          .from("companies")
          .select("settings")
          .eq("id", companyId)
          .maybeSingle();

        const existingSettings = company?.settings as any;
        const hasExistingCalendarSettings = existingSettings?.google_calendar?.selected_calendars || existingSettings?.google_calendar?.add_events_to_calendar;

        // Only auto-select if user has NEVER configured calendar settings before
        if (!hasExistingCalendarSettings && calendars.length > 0) {
          const primaryCal = calendars.find((c: any) => c.primary);

          // Auto-select primary calendar for conflict checking
          if (primaryCal && selectedCalendarIds.length === 0) {
            setSelectedCalendarIds([primaryCal.id]);
          }

          // Auto-select primary calendar for adding events
          if (!selectedCalendarForEvents) {
            if (primaryCal) {
              setSelectedCalendarForEvents(primaryCal.id);
            } else if (calendars[0]) {
              setSelectedCalendarForEvents(calendars[0].id);
            }
          }
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

  const handleBrandingSave = async () => {
    setBrandingSaving(true);
    try {
      // Get user ID for development mode
      const { data: { user } } = await supabase.auth.getUser();

      // Call the update-branding Edge Function via dev proxy
      const res = await fetch('/api/edge-proxy', {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          functionName: 'update-branding',
          payload: {
            branding_name: brandingNameInput,
            branding_hide_badge: brandingHideBadge,
            user_id: user?.id, // Explicitly pass user_id for dev mode
          },
          method: 'POST',
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.details || "Failed to update branding");
      }

      const responseData = await res.json().catch(() => ({}));

      // Update booking prefix state
      if (responseData.booking_slug_prefix) {
        setBookingPrefix(responseData.booking_slug_prefix);
      }

      // Show success message with URL change notification
      if (responseData.slug_changed) {
        toast({
          title: "Branding updated",
          description: `Your booking URL is now: /book/${responseData.booking_slug_prefix}/...`,
        });
      } else {
        toast({ title: "Branding settings updated" });
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setBrandingSaving(false);
    }
  };

  const handleSaveNotificationEmails = async () => {
    setEmailsSaving(true);
    try {
      const companyId = await getCompanyId({ allowFallback: true });
      if (!companyId) {
        toast({ title: "Error", description: "No company found", variant: "destructive" });
        return;
      }

      const { error } = await supabase
        .from("companies")
        .update({ notification_emails: notificationEmails })
        .eq("id", companyId);

      if (error) throw error;
      toast({ title: "Notification emails updated" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setEmailsSaving(false);
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

      // Fetch existing settings to merge with (don't overwrite other settings)
      const { data: existingCompany } = await supabase
        .from("companies")
        .select("settings")
        .eq("id", companyId)
        .single();

      const existingSettings = (existingCompany?.settings as any) || {};

      const settings = {
        ...existingSettings,
        google_calendar: {
          auto_add_bookings: autoAddToCalendar,
          check_conflicts: checkCalendarConflicts,
          auto_create_meet_links: autoCreateMeetLinks,
          sync_existing_events: syncExistingEvents,
          sync_interval: calendarSyncInterval,
          selected_calendars: selectedCalendarIds,
          add_events_to_calendar: selectedCalendarForEvents,
        },
      };

      const { error } = await supabase
        .from("companies")
        .update({ settings })
        .eq("id", companyId);

      if (error) throw error;

      toast({ title: "Saved", description: "Integration settings updated" });

      // Reload settings to confirm they were saved
      await loadIntegrationSettings();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIntegrationSettingsSaving(false);
    }
  };

  const handleSyncNow = async () => {
    setSyncing(true);
    try {
      const companyId = await getCompanyId({ allowFallback: true });
      if (!companyId) {
        toast({ title: "Error", description: "No company found", variant: "destructive" });
        return;
      }

      const response = await fetch('/api/edge-proxy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          functionName: 'sync-calendar-events',
          payload: { company_id: companyId },
          method: 'POST',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to sync calendar');
      }

      if (data.skipped) {
        toast({ 
          title: "Sync Skipped", 
          description: data.message || "Sync existing events is disabled in settings" 
        });
      } else {
        toast({ 
          title: "Calendar Synced", 
          description: `Synced ${data.synced_count || 0} events from ${data.calendars_checked || 0} calendar(s)` 
        });
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setSyncing(false);
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
            <div className="flex gap-2">
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
              <Button variant="secondary" size="sm" onClick={handleTimezoneSave} disabled={timezoneSaving} className="whitespace-nowrap">
                {timezoneSaving ? "Saving..." : "Save"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Current time: {currentTime || "Loading..."}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Currency Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Currency</CardTitle>
          <CardDescription>
            Select your default currency for revenue tracking and displays
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="currency-select">Default Currency</Label>
            <div className="flex gap-2">
              <Select value={defaultCurrency} onValueChange={setDefaultCurrency}>
                <SelectTrigger id="currency-select">
                  <SelectValue placeholder="Select a currency" />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((currency) => (
                    <SelectItem key={currency.code} value={currency.code}>
                      {currency.symbol} {currency.name} ({currency.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="secondary" size="sm" onClick={handleCurrencySave} disabled={currencySaving} className="whitespace-nowrap">
                {currencySaving ? "Saving..." : "Save"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              This will be used as the default for new revenue entries. Individual entries can have different currencies.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Brand Name Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Brand name</CardTitle>
          <CardDescription>
            Customize your product name shown in the header and booking pages
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="brand-name-input">Product name</Label>
            <div className="flex gap-2">
              <Input
                id="brand-name-input"
                value={brandingNameInput}
                onChange={(e) => setBrandingNameInput(e.target.value)}
                placeholder="e.g. Scale Info"
                disabled={brandingSaving}
              />
              <Button variant="secondary" size="sm" onClick={handleBrandingSave} disabled={brandingSaving} className="whitespace-nowrap">
                {brandingSaving ? "Saving..." : "Save"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Replaces "Formify CRM" in the header and appears on public pages.
            </p>
          </div>

          {/* Booking URL Preview */}
          <div className="space-y-2 border rounded-lg p-3 bg-muted/30">
            <div className="font-medium text-sm">Booking URL preview</div>
            <p className="text-xs text-muted-foreground">
              Your public booking links use this format:
            </p>
            <div className="font-mono text-xs bg-background border rounded px-2 py-1.5">
              /book/<span className="text-primary font-semibold">{bookingPrefix || 'your-name'}</span>/event-slug
            </div>
            {brandingNameInput.trim() && brandingNameInput.trim().toLowerCase().replace(/[^a-z0-9]+/g, '') !== bookingPrefix && (
              <div className="flex gap-2 items-start p-2 bg-yellow-500/10 border border-yellow-500/20 rounded text-xs">
                <div className="text-yellow-600 dark:text-yellow-500 mt-0.5">⚠️</div>
                <div className="flex-1">
                  <div className="font-medium text-yellow-700 dark:text-yellow-400">Your booking URLs will change</div>
                  <div className="text-yellow-600 dark:text-yellow-500 mt-1">
                    New format: /book/<span className="font-semibold">{brandingNameInput.trim().toLowerCase().replace(/[^a-z0-9]+/g, '') || 'your-name'}</span>/event-slug
                  </div>
                  <div className="mt-1 text-yellow-600/80 dark:text-yellow-500/80">
                    Update any shared links after saving!
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Notification Emails Section */}
          <div className="space-y-2 border rounded-lg p-3 bg-muted/30">
            <div className="font-medium text-sm">Booking notification emails</div>
            <p className="text-xs text-muted-foreground">
              Add email addresses to receive notifications when bookings are made
            </p>
            
            <div className="space-y-2">
              {notificationEmails.map((email, index) => (
                <div key={index} className="flex gap-2 items-center">
                  <Input value={email} disabled className="flex-1 text-sm" />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const updated = notificationEmails.filter((_, i) => i !== index);
                      setNotificationEmails(updated);
                    }}
                  >
                    Remove
                  </Button>
                </div>
              ))}
              
              <div className="flex gap-2">
                <Input
                  placeholder="email@example.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newEmail.includes('@')) {
                      setNotificationEmails([...notificationEmails, newEmail]);
                      setNewEmail("");
                    }
                  }}
                  className="text-sm"
                />
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    if (newEmail.includes('@')) {
                      setNotificationEmails([...notificationEmails, newEmail]);
                      setNewEmail("");
                    }
                  }}
                  className="whitespace-nowrap"
                >
                  Add
                </Button>
              </div>
              
              <Button
                variant="default"
                size="sm"
                onClick={handleSaveNotificationEmails}
                disabled={emailsSaving}
                className="w-full"
              >
                {emailsSaving ? "Saving..." : "Save Notification Emails"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Watermark Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Watermark</CardTitle>
          <CardDescription>
            Remove the "Powered by Formify CRM" badge from public pages
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between border rounded-lg p-3">
            <div>
              <div className="font-medium text-sm">Hide "Powered by Formify CRM" badge</div>
              <p className="text-xs text-muted-foreground">
                Toggle on to remove the badge from booking pages and public forms
              </p>
            </div>
            <Switch
              checked={brandingHideBadge}
              onCheckedChange={async (checked) => {
                setBrandingHideBadge(checked);
                // Auto-save when toggled
                setBrandingSaving(true);
                try {
                  // Get user ID for development mode
                  const { data: { user } } = await supabase.auth.getUser();

                  const res = await fetch('/api/edge-proxy', {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                      functionName: 'update-branding',
                      payload: {
                        branding_name: brandingNameInput,
                        branding_hide_badge: checked,
                        user_id: user?.id, // Explicitly pass user_id for dev mode
                      },
                      method: 'POST',
                    }),
                  });

                  if (res.ok) {
                    toast({ title: "Watermark setting updated" });
                  }
                } catch (error) {
                  console.error("Error saving watermark setting:", error);
                } finally {
                  setBrandingSaving(false);
                }
              }}
              disabled={brandingSaving}
            />
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
            
            {/* Add to calendar section */}
            <div className="space-y-4 border rounded-lg p-6 bg-card">
              <div>
                <h3 className="font-semibold text-base">Add to calendar</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Select where to add events when you're booked.
                </p>
              </div>

              <div className="space-y-3">
                <Label htmlFor="add-to-calendar" className="text-sm font-medium">Add events to</Label>
                <Select
                  value={selectedCalendarForEvents || availableCalendars.find(c => c.primary)?.id || availableCalendars[0]?.id || ""}
                  onValueChange={(value) => {
                    setSelectedCalendarForEvents(value);
                  }}
                >
                  <SelectTrigger id="add-to-calendar">
                    <SelectValue placeholder="Select calendar" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableCalendars.map((calendar) => (
                      <SelectItem key={calendar.id} value={calendar.id}>
                        {calendar.summary} {calendar.primary && '(Google - Primary)'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  You can override this on a per-event basis in Advanced settings in each event type.
                </p>
              </div>
            </div>

            {/* Check for conflicts section */}
            <div className="space-y-4 border rounded-lg p-6 bg-card">
              <div>
                <h3 className="font-semibold text-base">Check for conflicts</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Select which calendars you want to check for conflicts to prevent double bookings.
                </p>
              </div>

              {loadingCalendars ? (
                <p className="text-sm text-muted-foreground">Loading calendars...</p>
              ) : availableCalendars.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-sm text-muted-foreground">
                    Connect your Google Calendar above to select calendars
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-start gap-3 p-4 border rounded-lg">
                    <div className="w-10 h-10 flex items-center justify-center bg-white rounded-lg border shadow-sm">
                      <svg viewBox="0 0 48 48" className="w-6 h-6">
                        <path fill="#1976D2" d="M38,6H10c-2.209,0-4,1.791-4,4v28c0,2.209,1.791,4,4,4h28c2.209,0,4-1.791,4-4V10C42,7.791,40.209,6,38,6z"/>
                        <path fill="#FFF" d="M34,14h-4v-2c0-0.552-0.447-1-1-1h-2c-0.553,0-1,0.448-1,1v2h-4v-2c0-0.552-0.447-1-1-1h-2c-0.553,0-1,0.448-1,1v2h-4c-1.104,0-2,0.896-2,2v16c0,1.104,0.896,2,2,2h20c1.104,0,2-0.896,2-2V16C36,14.896,35.104,14,34,14z M32,30H16V20h16V30z"/>
                        <rect x="20" y="24" fill="#1976D2" width="3" height="3"/>
                        <rect x="25" y="24" fill="#1976D2" width="3" height="3"/>
                      </svg>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-sm">Google Calendar</h4>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {availableCalendars[0]?.summary}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-0.5">
                    <p className="text-sm text-muted-foreground px-1">
                      Toggle the calendars you want to check for conflicts to prevent double bookings.
                    </p>
                  </div>

                  <div className="space-y-2">
                    {availableCalendars.map((calendar) => (
                      <div key={calendar.id} className="flex items-center justify-between py-2 px-1">
                        <Label htmlFor={`calendar-toggle-${calendar.id}`} className="text-sm font-normal cursor-pointer">
                          {calendar.summary}
                        </Label>
                        <Switch
                          id={`calendar-toggle-${calendar.id}`}
                          checked={selectedCalendarIds.includes(calendar.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedCalendarIds([...selectedCalendarIds, calendar.id]);
                            } else {
                              setSelectedCalendarIds(selectedCalendarIds.filter(id => id !== calendar.id));
                            }
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-2 space-y-4 border-t">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="check-conflicts" className="text-sm font-medium">Enable conflict checking</Label>
                    <p className="text-xs text-muted-foreground">
                      Prevent double-bookings in real-time
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
                    <Label htmlFor="sync-existing" className="text-sm font-medium">Sync existing events</Label>
                    <p className="text-xs text-muted-foreground">
                      Block times for existing calendar events
                    </p>
                  </div>
                  <Switch
                    id="sync-existing"
                    checked={syncExistingEvents}
                    onCheckedChange={setSyncExistingEvents}
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={handleSyncNow}
                disabled={syncing || !syncExistingEvents}
              >
                {syncing ? "Syncing..." : "Sync Now"}
              </Button>
              <Button onClick={handleIntegrationSettingsSave} disabled={integrationSettingsSaving}>
                {integrationSettingsSaving ? "Saving..." : "Save settings"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
