"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { PreviewModeToggle } from "@/components/PreviewModeToggle";
import { BarChart3, PoundSterling, Target, Calendar, TrendingUp, Menu, X, Phone, Coins, Star, Settings, LogOut, UserCircle, Bell } from "lucide-react";
import { Newsletter } from "@/components/Newsletter";
import { RevenueEntry, Goal } from "@/types/revenue";
import { useEntitlements } from "@/contexts/EntitlementsContext";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { getCompanyId } from "@/lib/company";
import { useFeature } from "@/lib/entitlements/useFeature";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { configureBookingBranding, DEFAULT_PRODUCT_SEGMENT } from "@/lib/urls";
import { detectWhopContext, readWhopIdentity } from "@/lib/embed";
import { BrandingProvider } from "@/contexts/BrandingContext";
import { LockTile } from "@/components/entitlements/LockTile";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Common timezones grouped by region
const TIMEZONES = [
  { value: "America/New_York", label: "Eastern Time (ET)" },
  { value: "America/Chicago", label: "Central Time (CT)" },
  { value: "America/Denver", label: "Mountain Time (MT)" },
  { value: "America/Phoenix", label: "Arizona (MST)" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
  { value: "America/Anchorage", label: "Alaska Time (AKT)" },
  { value: "Pacific/Honolulu", label: "Hawaii Time (HST)" },
  { value: "America/Toronto", label: "Toronto (ET)" },
  { value: "America/Vancouver", label: "Vancouver (PT)" },
  { value: "Europe/London", label: "London (GMT/BST)" },
  { value: "Europe/Paris", label: "Paris (CET)" },
  { value: "Europe/Berlin", label: "Berlin (CET)" },
  { value: "Europe/Madrid", label: "Madrid (CET)" },
  { value: "Europe/Rome", label: "Rome (CET)" },
  { value: "Europe/Amsterdam", label: "Amsterdam (CET)" },
  { value: "Asia/Dubai", label: "Dubai (GST)" },
  { value: "Asia/Kolkata", label: "India (IST)" },
  { value: "Asia/Singapore", label: "Singapore (SGT)" },
  { value: "Asia/Hong_Kong", label: "Hong Kong (HKT)" },
  { value: "Asia/Tokyo", label: "Tokyo (JST)" },
  { value: "Australia/Sydney", label: "Sydney (AEDT)" },
  { value: "Pacific/Auckland", label: "Auckland (NZDT)" },
];

interface LayoutProps {
  children: React.ReactNode;
  revenueEntries: RevenueEntry[];
  goals: Goal[];
}
export const Layout = ({
  children,
  revenueEntries,
  goals
}: LayoutProps) => {
  const pathname = usePathname();
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLocalHost, setIsLocalHost] = useState(false);
  const { entitlements, loading: entitlementsLoading } = useEntitlements();
  const { user, signOut, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const { plan, removeWatermark } = useFeature();
  const [brandName, setBrandName] = useState<string>("");
  const [orgDisplayName, setOrgDisplayName] = useState<string>("");
  const [orgContactEmail, setOrgContactEmail] = useState<string | null>(null);
  const [bookingPrefix, setBookingPrefix] = useState<string>(DEFAULT_PRODUCT_SEGMENT);
  const [displayNamePromptOpen, setDisplayNamePromptOpen] = useState(false);
  const [displayNameValue, setDisplayNameValue] = useState("");
  const [savingDisplayName, setSavingDisplayName] = useState(false);
  const [hasCapturedDisplayName, setHasCapturedDisplayName] = useState(false);
  const [accountDialogOpen, setAccountDialogOpen] = useState(false);
  const [accountDisplayName, setAccountDisplayName] = useState("");
  const [accountSavingName, setAccountSavingName] = useState(false);

  // Debug: Monitor dialog state changes
  useEffect(() => {
    console.log("accountDialogOpen changed to:", accountDialogOpen);
  }, [accountDialogOpen]);
  const [brandingNameInput, setBrandingNameInput] = useState("");
  const [brandingHideBadge, setBrandingHideBadge] = useState(false);
  const [brandingSaving, setBrandingSaving] = useState(false);
  const [isWhopEmbed, setIsWhopEmbed] = useState(() => detectWhopContext());
  const [userTimezone, setUserTimezone] = useState<string>(() => Intl.DateTimeFormat().resolvedOptions().timeZone);
  const [timezoneSaving, setTimezoneSaving] = useState(false);

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const host = window.location.hostname;
      setIsLocalHost(host === "localhost" || host === "127.0.0.1");
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const evaluate = () => setIsWhopEmbed(detectWhopContext());
    evaluate();
    const handle = window.setInterval(evaluate, 1000);
    return () => window.clearInterval(handle);
  }, []);

  // In Whop embeds, remember the last meaningful app route so we can restore it after reload
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!isWhopEmbed) return;

    const path = pathname;
    const trackablePrefixes = [
      "/dashboard",
      "/scheduling",
      "/analytics",
      "/call-tracker",
      "/calendar",
      "/events",
    ];

    const shouldTrack = trackablePrefixes.some((prefix) => path.startsWith(prefix));
    if (!shouldTrack) return;

    try {
      window.localStorage.setItem("formify:last_path", path);
    } catch (error) {
      console.warn("Failed to persist last path", error);
    }
  }, [pathname, isWhopEmbed]);

  const showPreviewToggle = isLocalHost;

  useEffect(() => {
    setHasCapturedDisplayName(false);
  }, [user?.id]);

  // In Whop embeds, try to auto-populate display name from Whop identity once
  useEffect(() => {
    if (!isWhopEmbed || !user || hasCapturedDisplayName) return;

    const identity = readWhopIdentity();
    const whopName = identity.name?.trim() || identity.username?.trim();
    if (!whopName) return;

    (async () => {
      try {
        await performDisplayNameUpdate(whopName);
        
        // Also store profile picture if available
        if (identity.profilePicture) {
          try {
            const companyId = await getCompanyId({ allowFallback: false });
            if (companyId) {
              await (supabase as any)
                .from("companies")
                .update({ 
                  whop_user_id: identity.userId,
                  whop_profile_picture: identity.profilePicture 
                })
                .eq("id", companyId);
            }
          } catch (error) {
            console.warn("Failed to sync Whop profile picture", error);
          }
        }
      } catch (error) {
        console.warn("Failed to sync Whop display name", error);
      }
    })();
  }, [isWhopEmbed, user, hasCapturedDisplayName]);

  const performDisplayNameUpdate = async (trimmed: string) => {
    const { error } = await supabase.auth.updateUser({
      data: {
        display_name: trimmed,
        name: trimmed,
      },
    });
    if (error) throw error;
    try {
      const companyId = await getCompanyId({ allowFallback: false });
      if (companyId) {
        const { error: companyError } = await (supabase as any)
          .from("companies")
          .update({ branding_display_name: trimmed })
          .eq("id", companyId);
        if (companyError) {
          console.warn("Failed to sync branding_display_name", companyError);
        }
      }
    } catch (companySyncError) {
      console.warn("Unable to sync company display name", companySyncError);
    }
    await supabase.auth.refreshSession().catch(() => undefined);
    setDisplayNameValue(trimmed);
    setHasCapturedDisplayName(true);
    setDisplayNamePromptOpen(false);
  };

  const handleSaveDisplayName = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = displayNameValue.trim();
    const normalized = trimmed.toLowerCase();
    if (trimmed.length < 2) {
      toast({ title: "Name too short", description: "Please enter at least 2 characters.", variant: "destructive" });
      return;
    }
    if (normalized === "company") {
      toast({
        title: "Choose a custom name",
        description: "Pick something other than the default placeholder.",
        variant: "destructive",
      });
      return;
    }

    setSavingDisplayName(true);
    try {
      await performDisplayNameUpdate(trimmed);
      toast({ title: "Display name saved", description: "We’ll use this across the workspace." });
    } catch (err: any) {
      toast({ title: "Could not save name", description: err?.message ?? "Please try again.", variant: "destructive" });
    } finally {
      setSavingDisplayName(false);
    }
  };

  const openAccountSettings = async () => {
    console.log("openAccountSettings called", { authLoading, user: !!user });
    
    if (authLoading) {
      console.log("Auth still loading");
      toast({ title: "Loading session", description: "Please wait a moment while we load your account details.", variant: "default" });
      return;
    }
    if (!user) {
      console.log("No user found");
      toast({ title: "No user session", description: "Please wait for your session to load before editing account details.", variant: "destructive" });
      return;
    }
    
    console.log("Opening account dialog");
    const metadata = (user.user_metadata ?? {}) as Record<string, unknown>;
    const currentName =
      displayNameValue ||
      (metadata.display_name as string) ||
      (metadata.name as string) ||
      "";
    setAccountDisplayName(currentName);

    // Load user's timezone preference
    try {
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

    console.log("Setting accountDialogOpen to true");
    setAccountDialogOpen(true);
    console.log("Dialog state set, accountDialogOpen should now be true");
    
    try {
      const resolvedCompanyId = await getCompanyId({ allowFallback: false });
      void resolvedCompanyId;
    } catch (error) {
      console.warn("Failed to load organization id", error);
    }
  };

  const handleTimezoneSave = async () => {
    if (!user?.id) return;

    setTimezoneSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .upsert({
          id: user.id,
          timezone: userTimezone,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;

      toast({
        title: "Timezone updated",
        description: "Your timezone preference has been saved",
      });
    } catch (error: any) {
      console.error("Error saving timezone:", error);
      toast({
        title: "Could not save timezone",
        description: error?.message ?? "Please try again.",
        variant: "destructive",
      });
    } finally {
      setTimezoneSaving(false);
    }
  };

  const handleAccountDisplayNameSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = accountDisplayName.trim();
    const normalized = trimmed.toLowerCase();
    if (trimmed.length < 2) {
      toast({ title: "Name too short", description: "Please enter at least 2 characters.", variant: "destructive" });
      return;
    }
    if (normalized === "company") {
      toast({
        title: "Choose a custom name",
        description: "Use something other than the default placeholder.",
        variant: "destructive",
      });
      return;
    }
    setAccountSavingName(true);
    try {
      await performDisplayNameUpdate(trimmed);
      setAccountDisplayName(trimmed);
      toast({ title: "Display name updated", description: "Your new name will appear across the workspace." });
    } catch (err: any) {
      toast({ title: "Could not save name", description: err?.message ?? "Please try again.", variant: "destructive" });
    } finally {
      setAccountSavingName(false);
    }
  };

  const handleBrandingSave = async () => {
    if (!removeWatermark) {
      return;
    }
    const name = brandingNameInput.trim();
    setBrandingSaving(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;
      if (!token) {
        throw new Error("Not authenticated");
      }
      const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/update-branding`;
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        },
        body: JSON.stringify({ branding_name: name || null, branding_hide_badge: brandingHideBadge }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error((j as any)?.error || "Failed to update branding");
      }
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("branding:updated", {
            detail: { branding_name: name || null },
          }),
        );
      }
      toast({ title: "Branding settings updated" });
    } catch (error: any) {
      toast({
        title: "Could not update branding",
        description: error?.message ?? "Please try again.",
        variant: "destructive",
      });
    } finally {
      setBrandingSaving(false);
    }
  };

  useEffect(() => {
    if (!user || user.is_anonymous) {
      setDisplayNamePromptOpen(false);
      return;
    }

    // In Whop embeds, we should not prompt for a manual name; it comes from Whop
    if (isWhopEmbed) {
      setDisplayNamePromptOpen(false);
      return;
    }

    const metadata = (user.user_metadata ?? {}) as Record<string, unknown>;
    const rawExisting =
      (metadata.display_name as string) || (metadata.name as string) || "";
    const normalizedExisting = rawExisting.trim();
    const isDefaultName =
      normalizedExisting.length > 0 && normalizedExisting.toLowerCase() === "company";

    if (normalizedExisting) {
      setDisplayNameValue(normalizedExisting);
    }

    if (normalizedExisting && !isDefaultName) {
      setDisplayNamePromptOpen(false);
      setHasCapturedDisplayName(true);
      return;
    }

    if (!hasCapturedDisplayName) {
      setDisplayNamePromptOpen(true);
    }
  }, [user, hasCapturedDisplayName, isWhopEmbed]);

  // Configure booking URLs whenever branding or plan changes
  useEffect(() => {
    const customProductName = removeWatermark ? brandName.trim() : "";
    configureBookingBranding({
      productName: customProductName ? customProductName : null,
      planId: entitlements?.plan_id ?? null,
      fallbackPrefix: bookingPrefix,
    });
  }, [brandName, entitlements?.plan_id, bookingPrefix, removeWatermark]);

  // Load custom branding name for header
  useEffect(() => {
    (async () => {
      try {
        if (!user?.id) return;
        const companyId = await getCompanyId({ allowFallback: false });
        if (!companyId) return;
        const { data: company } = await (supabase as any)
          .from('companies')
          .select('branding_name, branding_hide_badge, booking_slug_prefix, name, primary_contact_email')
          .eq('id', companyId)
          .maybeSingle();

        const rawBrandingName = typeof company?.branding_name === "string" ? company.branding_name : "";
        const rawOrgName = typeof company?.name === "string" ? company.name : "";
        const normalizedBranding = rawBrandingName.trim();
        const normalizedOrg = rawOrgName.trim();

        const prefix = typeof company?.booking_slug_prefix === "string" && company.booking_slug_prefix.trim().length > 0
          ? company.booking_slug_prefix
          : DEFAULT_PRODUCT_SEGMENT;

        setBrandName(normalizedBranding);
        setOrgDisplayName(normalizedOrg);
        setBookingPrefix(prefix);
        setBrandingNameInput(normalizedBranding);
        if (typeof company?.branding_hide_badge === "boolean") {
          setBrandingHideBadge(Boolean(company.branding_hide_badge));
        }
        const contactEmail = typeof company?.primary_contact_email === "string" ? company.primary_contact_email.trim() : "";
        setOrgContactEmail(contactEmail.length > 0 ? contactEmail : null);
      } catch {
        setBrandName("");
        setOrgDisplayName("");
        setOrgContactEmail(null);
        setBookingPrefix(DEFAULT_PRODUCT_SEGMENT);
        setBrandingNameInput("");
        setBrandingHideBadge(false);
      }
    })();
  }, [user?.id]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleBrandingUpdated = (event: Event) => {
      const detail = (event as CustomEvent<{ branding_name?: string | null }>).detail;
      const nextName = detail?.branding_name?.trim() ?? "";
      setBrandName(nextName);
    };

    window.addEventListener("branding:updated", handleBrandingUpdated as EventListener);
    return () => {
      window.removeEventListener("branding:updated", handleBrandingUpdated as EventListener);
    };
  }, []);

  const planBadges: Record<string, { label: string; tone: "red" | "amber" | "green" | "blue" }> = {
    preview: { label: "Free Plan", tone: "red" },
    solo: { label: "Solo Plan", tone: "amber" },
  };

  const badge = !entitlementsLoading && entitlements?.plan_id && planBadges[entitlements.plan_id]
    ? planBadges[entitlements.plan_id]
    : null;

  const toneClasses: Record<string, string> = {
    red: "bg-red-600 border-white text-white",
    amber: "bg-amber-500 border-white text-white",
    green: "bg-emerald-500 border-white text-white",
    blue: "bg-blue-500 border-white text-white",
  };

  const allNavigation = [
    {
      name: "Dashboard",
      href: "/dashboard",
      icon: BarChart3,
      description: "Overview and quick entry",
      show: true,
    },
    {
      name: "Scheduling",
      href: "/scheduling",
      icon: Calendar,
      description: "Event types and bookings",
      show: true,
    },
    {
      name: "Call Tracker",
      href: "/call-tracker",
      icon: Phone,
      description: "Manage calls and notes",
      show: true,
    },
    {
      name: "Analytics",
      href: "/analytics",
      icon: TrendingUp,
      description: "Deep insights and trends",
      show: true,
    },
    {
      name: "Settings",
      href: "/settings",
      icon: Settings,
      description: "Integrations and preferences",
      show: true,
    },
  ];

  const navigation = allNavigation.filter((item): item is NonNullable<typeof item> => Boolean(item && item.show));
  const isActive = (href: string) => {
    if (href === "/" && pathname === "/") return true;
    if (href !== "/" && pathname.startsWith(href)) return true;
    return false;
  };
  return (
    <BrandingProvider value={{ productName: removeWatermark && brandName.trim().length > 0 ? brandName.trim() : "Scale Info" }}>
      <div className="min-h-screen bg-background relative">
      {/* Content Layer */}
      <div className="relative z-10 min-h-screen">
        {/* Header */}
        <header className="fixed top-0 left-0 right-0 z-50 px-4 sm:px-6 py-4 sm:py-6 bg-transparent">
          <div className="max-w-4xl mx-auto border border-border rounded-3xl px-4 sm:px-6 py-3 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 relative">
            {badge && (
              <div className="absolute -top-2 -left-2 z-50">
                <div
                  className={`flex items-center gap-1 rounded-full border-2 px-2 py-0.5 text-[10px] font-semibold shadow-sm select-none ${toneClasses[badge.tone]}`}
                >
                  <Star className="h-3 w-3" />
                  <span>{badge.label.toUpperCase()}</span>
                </div>
              </div>
            )}
            <div className="flex items-center justify-between gap-2 sm:gap-4">
              {/* Logo */}
              <div className="flex items-center flex-shrink-0">
                <span className="text-base sm:text-lg font-semibold tracking-tight text-foreground">{removeWatermark && brandName.trim().length > 0 ? brandName.trim() : 'Scale Info'}</span>
              </div>

              {/* Desktop Navigation */}
              <nav className="hidden md:flex items-center space-x-1 flex-1 justify-center">
                {navigation.map(item => {
                  const Icon = item.icon;
                  return <Link key={item.name} href={item.href}>
                      <Button variant={isActive(item.href) ? "default" : "ghost"} size="sm" className="button-smooth gap-2">
                        <Icon className="w-4 h-4" />
                        <span className="hidden lg:inline">{item.name}</span>
                      </Button>
                    </Link>;
                })}
              </nav>

              {/* Right side controls */}
              <div className="flex items-center gap-1.5">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="flex h-9 w-9"
                      aria-label="Account menu"
                    >
                      <Settings className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={openAccountSettings} className="cursor-pointer">
                      <UserCircle className="mr-2 h-4 w-4" />
                      <span>Account settings</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                
                {/* Mobile menu button */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden h-9 w-9"
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  aria-label="Menu"
                >
                  {isMobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          </div>

        </header>
        
        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <div className="fixed top-24 left-6 right-6 z-40 md:hidden">
            <div className="border border-border rounded-3xl px-4 py-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
              <nav className="space-y-2">
                {navigation.map(item => {
                  const Icon = item.icon;
                  return <Link key={item.name} href={item.href} className="block">
                    <div className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                      isActive(item.href) ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                    }`}>
                      <Icon className="w-5 h-5" />
                      <div>
                        <div className="font-medium">{item.name}</div>
                        <div className="text-xs opacity-75">{item.description}</div>
                      </div>
                    </div>
                  </Link>;
                })}
                {/* Sign-out option intentionally removed from mobile navigation */}
              </nav>
            </div>
          </div>
        )}

      {/* Main Content */}
      <main className="flex-1 pt-24">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-background/95 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <PoundSterling className="w-4 h-4" />
                <span>{revenueEntries.length} entries</span>
              </div>
              <div className="flex items-center gap-1">
                <Target className="w-4 h-4" />
                <span>{goals.length} goals</span>
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                <span suppressHydrationWarning>Last updated: {new Date().toLocaleDateString()}</span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {showPreviewToggle && <PreviewModeToggle />}
              <div className="text-sm text-muted-foreground">Formify CRM 2025</div>
            </div>
          </div>
        </div>
      </footer>
      </div>
      <Newsletter />
      <Dialog open={accountDialogOpen} onOpenChange={setAccountDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Account settings</DialogTitle>
            <DialogDescription>Manage your account preferences and settings.</DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            {/* Timezone Section */}
            <div className="space-y-4 border-t pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium">Timezone</h3>
                  <p className="text-xs text-muted-foreground">Select your preferred timezone for displaying dates and times.</p>
                </div>
              </div>
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
                <div className="flex justify-end">
                  <Button variant="secondary" size="sm" onClick={handleTimezoneSave} disabled={timezoneSaving}>
                    {timezoneSaving ? "Saving..." : "Save timezone"}
                  </Button>
                </div>
              </div>
            </div>

            {/* Branding Section */}
            <div className="space-y-4 border-t pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium">Branding</h3>
                  <p className="text-xs text-muted-foreground">Configure your product name and watermark badge.</p>
                </div>
              </div>

              {!removeWatermark ? (
                <LockTile
                  title="Custom brand name and watermark"
                  description={plan === "preview" ? "Available on Pro. Try a 7-day Pro trial." : "Available on Pro"}
                  primaryPlan="pro"
                />
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="font-medium text-sm">Product name</div>
                    <p className="text-xs text-muted-foreground">
                      Shown in the top-left header (replaces "Formify CRM") and on public pages.
                    </p>
                    <div className="flex gap-2">
                      <Input
                        value={brandingNameInput}
                        onChange={(event) => setBrandingNameInput(event.target.value)}
                        placeholder="Your brand e.g. Acme CRM"
                        disabled={brandingSaving}
                      />
                    </div>
                  </div>

                  <div className="space-y-2 border rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-sm">Hide "Powered by Formify CRM" badge</div>
                        <p className="text-xs text-muted-foreground">
                          Available on the Pro plan. Toggle on to remove the badge from public pages.
                        </p>
                      </div>
                      <Switch
                        checked={brandingHideBadge}
                        onCheckedChange={setBrandingHideBadge}
                        disabled={brandingSaving}
                      />
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      The badge remains on Preview/Solo plans. Changes apply to booking pages and public forms.
                    </p>
                  </div>

                  <div className="flex justify-end">
                    <Button variant="secondary" type="button" disabled={brandingSaving} onClick={handleBrandingSave}>
                      {brandingSaving ? "Saving…" : "Save branding"}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog
        open={displayNamePromptOpen}
        onOpenChange={(next) => {
          if (!next && !hasCapturedDisplayName) {
            toast({
              title: "Finish setting up your profile",
              description: "Please enter a display name before closing—it's how we personalize your workspace.",
              variant: "destructive",
            });
            setDisplayNamePromptOpen(true);
            return;
          }
          setDisplayNamePromptOpen(next);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Pick a display name</DialogTitle>
            <DialogDescription>
              We’ll show this name to your team and invitees. You can update it anytime from your profile.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveDisplayName} className="space-y-4">
            <Input
              autoFocus
              placeholder="e.g. Alex Rivera"
              value={displayNameValue}
              onChange={(event) => setDisplayNameValue(event.target.value)}
              disabled={savingDisplayName}
              maxLength={80}
            />
            <DialogFooter className="sm:justify-end">
              <Button type="submit" disabled={savingDisplayName}>
                {savingDisplayName ? "Saving…" : "Save display name"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  </BrandingProvider>
);
};