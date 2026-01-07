"use client";

import { useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Lock, Loader2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { getCompanyId } from "@/lib/company";
import Link from "next/link";
import { useEntitlements } from "@/contexts/EntitlementsContext";
import { useFeature } from "@/lib/entitlements/useFeature";
import { supabase } from "@/integrations/supabase/client";
import { LockTile } from "@/components/entitlements/LockTile";
import { toast } from "sonner";
import { startWhopOAuth } from "@/lib/whopOAuth";

export const IntegrationsSettings = () => {
  const { entitlements } = useEntitlements();
  const hasFullIntegrations = entitlements.integrations_bundle === "included" || entitlements.integrations_bundle === "advanced";
  const { integrations, plan } = useFeature();
  const isProPlan = plan === "pro";
  const [googleIntegration, setGoogleIntegration] = useState<{ connected: boolean; email: string | null }>({ connected: false, email: null });
  const [loadingScope, setLoadingScope] = useState<"calendar" | "meet" | null>(null);
  const [disconnecting, setDisconnecting] = useState(false);
  const isDev = process.env.NODE_ENV === 'development';
  const [hasSession, setHasSession] = useState(true);
  const [autoAddBookings, setAutoAddBookings] = useState(true);
  const [autoCreateMeetLinks, setAutoCreateMeetLinks] = useState(true);
  const [savingPreferences, setSavingPreferences] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadIntegration = async () => {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session) {
        if (isMounted) setGoogleIntegration({ connected: false, email: null });
        return;
      }
      const { data, error } = await supabase
        .from("user_integrations")
        .select("email")
        .eq("provider", "google")
        .maybeSingle();
      if (!isMounted) return;
      if (error && error.code !== "PGRST116") {
        console.error("Failed to load integrations", error);
        return;
      }
      setGoogleIntegration({ connected: Boolean(data), email: data?.email ?? null });

      // Load company settings for Google Calendar preferences
      if (data) {
        try {
          const companyId = await getCompanyId();
          if (companyId) {
            const { data: company } = await supabase
              .from('companies')
              .select('settings')
              .eq('id', companyId)
              .maybeSingle();
            
            if (company?.settings) {
              const settings = company.settings as any;
              const gcalSettings = settings?.google_calendar || {};
              setAutoAddBookings(gcalSettings.auto_add_bookings ?? true);
              setAutoCreateMeetLinks(gcalSettings.auto_create_meet_links ?? true);
            }
          }
        } catch (err) {
          console.error('Failed to load calendar preferences:', err);
        }
      }
    };

    loadIntegration();

    const channel = supabase
      .channel("user-integrations-google")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "user_integrations" },
        (payload) => {
          if ((payload.new as any)?.provider === "google" || (payload.old as any)?.provider === "google") {
            loadIntegration();
          }
        }
      )
      .subscribe();

    const { data: authListener } = supabase.auth.onAuthStateChange(() => {
      loadIntegration();
    });

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
      authListener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      setHasSession(!!data.session);
    })();
  }, []);

  const handleConnect = useCallback(async (scope: "calendar" | "meet") => {
    try {
      console.log('Starting OAuth flow for scope:', scope);
      setLoadingScope(scope);
      
      // Get Whop identity and store in localStorage before OAuth
      const { detectWhopContext, readWhopIdentity } = await import('@/lib/embed');
      const isWhop = detectWhopContext();
      console.log('Whop context detected:', isWhop);
      
      // Get Whop identity - either from context or environment variable
      let whopOrgId = null;
      let whopEmail = null;
      let whopName = null;

      if (isWhop) {
        const whopIdentity = readWhopIdentity();
        console.log('Whop identity from context:', whopIdentity);
        whopOrgId = whopIdentity?.orgId;
        whopEmail = whopIdentity?.email;
        whopName = whopIdentity?.name;
      }

      // Fallback to environment variable if not found in Whop context
      if (!whopOrgId && process.env.NEXT_PUBLIC_WHOP_COMPANY_ID) {
        whopOrgId = process.env.NEXT_PUBLIC_WHOP_COMPANY_ID;
        console.log('📦 Using Whop company ID from environment:', whopOrgId);
      }

      // Store identity in localStorage for OAuth callback if we have an orgId
      if (whopOrgId) {
        const identityData = {
          orgId: whopOrgId,
          email: whopEmail,
          name: whopName,
          timestamp: Date.now()
        };

        localStorage.setItem('whop_oauth_identity', JSON.stringify(identityData));
        sessionStorage.setItem('whop_oauth_identity', JSON.stringify(identityData));
        console.log('✅ Whop identity stored for OAuth callback:', identityData);
      } else {
        console.error('❌ No Whop org ID available - Set NEXT_PUBLIC_WHOP_COMPANY_ID in .env.local');
      }

      // Get current user ID to ensure integration is linked to the right user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      const currentUserId = user?.id;

      console.log('🔍 Getting current user...');
      console.log('User error:', userError);
      console.log('User object:', user);
      console.log('Current user ID:', currentUserId);

      if (!currentUserId) {
        console.error('❌ No user ID found! Cannot proceed with OAuth.');
        toast.error('Unable to get user session. Please refresh the page and try again.');
        setLoadingScope(null);
        return;
      }

      // Build query parameters
      const query: Record<string, string> = { scope };
      if (whopOrgId) query.whop_org_id = whopOrgId;
      if (whopEmail) query.whop_email = whopEmail;
      if (whopName) query.whop_name = whopName;

      // Pass current user ID through state parameter
      const stateData: Record<string, string> = {};
      if (whopOrgId) stateData.whop_org_id = whopOrgId;
      if (whopEmail) stateData.whop_email = whopEmail;
      if (whopName) stateData.whop_name = whopName;
      if (currentUserId) stateData.user_id = currentUserId;

      // Encode state to match the format expected by google-exchange-token
      // Must use TextEncoder to match the decoding logic
      const encoder = new TextEncoder();
      const stateBytes = encoder.encode(JSON.stringify(stateData));
      const stateParam = btoa(String.fromCharCode(...stateBytes));
      query.state_override = stateParam;

      console.log('State data being sent:', stateData);
      console.log('Encoded state param:', stateParam);
      console.log('Full query object:', query);

      console.log('Fetching OAuth URL via edge-proxy');
      const res = await fetch('/api/edge-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          functionName: 'google-auth-url',
          method: 'GET',
          query,
        }),
      });
      
      console.log('OAuth URL response status:', res.status);
      
      if (!res.ok) {
        const errorText = await res.text();
        console.error('Google auth URL error:', { status: res.status, error: errorText });
        throw new Error(`Failed to start Google auth: ${errorText}`);
      }
      
      const j = await res.json();
      console.log('OAuth URL response:', j);
      
      if (!j?.url) {
        console.error('Missing auth URL in response:', j);
        throw new Error('Missing auth URL');
      }

      console.log('Opening Google OAuth in new window');
      console.log('Full OAuth URL:', j.url);
      
      // Check if state parameter is in the URL
      try {
        const oauthUrl = new URL(j.url);
        const stateParam = oauthUrl.searchParams.get('state');
        console.log('State parameter in OAuth URL:', stateParam ? 'YES (' + stateParam + ')' : 'NO - MISSING!');
      } catch (e) {
        console.error('Failed to parse OAuth URL:', e);
      }
      // Open in new window to bypass Whop iframe CSP restrictions
      const width = 600;
      const height = 700;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;
      
      const popup = window.open(
        j.url,
        'google-oauth',
        `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no,scrollbars=yes`
      );
      
      if (!popup) {
        // Fallback if popup blocked
        console.log('Popup blocked, redirecting in same window');
        window.location.href = j.url;
      } else {
        // Listen for OAuth completion
        const checkPopup = setInterval(() => {
          if (popup.closed) {
            clearInterval(checkPopup);
            setLoadingScope(null);
            // Refresh integration status
            window.location.reload();
          }
        }, 500);
      }
    } catch (e: any) {
      console.error('connect-integration error:', e);
      toast.error(e?.message || 'Failed to start Google authentication');
      setLoadingScope(null);
    }
  }, []);

  async function handleDisconnect() {
    try {
      setDisconnecting(true);
      const { error } = await supabase
        .from("user_integrations")
        .delete()
        .eq("provider", "google");
      if (error) throw error;
      setGoogleIntegration({ connected: false, email: null });
      toast.success("Google integration disconnected");
    } catch (error) {
      console.error("disconnect-integration", error);
      toast.error("Failed to disconnect Google");
    } finally {
      setDisconnecting(false);
    }
  }

  const handlePreferenceChange = async (preference: 'auto_add_bookings' | 'auto_create_meet_links', value: boolean) => {
    console.log(`Toggling ${preference} to ${value}`);
    
    // Update local state immediately for responsive UI
    if (preference === 'auto_add_bookings') {
      setAutoAddBookings(value);
    } else {
      setAutoCreateMeetLinks(value);
    }

    setSavingPreferences(true);
    try {
      const companyId = await getCompanyId();
      if (!companyId) {
        throw new Error('No company ID found');
      }

      // Get current settings
      const { data: company } = await supabase
        .from('companies')
        .select('settings')
        .eq('id', companyId)
        .maybeSingle();

      const currentSettings = (company?.settings as any) || {};
      const updatedSettings = {
        ...currentSettings,
        google_calendar: {
          ...(currentSettings.google_calendar || {}),
          [preference]: value,
        },
      };

      console.log('Updating company settings:', updatedSettings);

      const { error } = await supabase
        .from('companies')
        .update({ settings: updatedSettings })
        .eq('id', companyId);

      if (error) throw error;

      console.log(`Successfully updated ${preference} to ${value}`);
      toast.success('Preference saved');
    } catch (error: any) {
      console.error('Failed to update preference:', error);
      toast.error(error?.message || 'Failed to save preference');
      // Revert local state on error
      if (preference === 'auto_add_bookings') {
        setAutoAddBookings(!value);
      } else {
        setAutoCreateMeetLinks(!value);
      }
    } finally {
      setSavingPreferences(false);
    }
  }

  const LockedIntegrationCard = ({
    name,
    logo,
    description,
    badgeLabel = "Coming Soon",
    upgradeable = true,
  }: {
    name: string;
    logo: string;
    description: string;
    badgeLabel?: string;
    upgradeable?: boolean;
  }) => (
    <div className="relative">
      <Card className="p-6 blur-sm pointer-events-none select-none">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            {logo && <img src={logo} alt={name} className="w-9 h-9 object-contain" />}
            <div>
              <h3 className="font-semibold">{name}</h3>
              <p className="text-sm text-muted-foreground">{description}</p>
            </div>
          </div>
          <Badge variant="secondary">{badgeLabel}</Badge>
        </div>
        <Button variant="outline" disabled>
          Connect {name}
        </Button>
      </Card>
      <div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-sm rounded-lg">
        <div className="text-center space-y-2 p-4">
          <Lock className="w-6 h-6 text-primary mx-auto" />
          <p className="text-sm font-medium">{upgradeable ? "Pro feature" : "Coming soon"}</p>
          {upgradeable ? (
            <Button asChild size="sm" variant="default">
              <Link href="/pricing">Upgrade to Pro</Link>
            </Button>
          ) : (
            <span className="block text-xs text-muted-foreground">Available soon</span>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Integrations</h2>
        <p className="text-muted-foreground">Connect your calendar and marketing tools</p>
      </div>

      <div className="grid gap-4">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 flex items-center justify-center bg-white rounded-lg border shadow-sm">
                <svg viewBox="0 0 48 48" className="w-6 h-6">
                  <path fill="#1976D2" d="M38,6H10c-2.209,0-4,1.791-4,4v28c0,2.209,1.791,4,4,4h28c2.209,0,4-1.791,4-4V10C42,7.791,40.209,6,38,6z"/>
                  <path fill="#FFF" d="M34,14h-4v-2c0-0.552-0.447-1-1-1h-2c-0.553,0-1,0.448-1,1v2h-4v-2c0-0.552-0.447-1-1-1h-2c-0.553,0-1,0.448-1,1v2h-4c-1.104,0-2,0.896-2,2v16c0,1.104,0.896,2,2,2h20c1.104,0,2-0.896,2-2V16C36,14.896,35.104,14,34,14z M32,30H16V20h16V30z"/>
                  <rect x="20" y="24" fill="#1976D2" width="3" height="3"/>
                  <rect x="25" y="24" fill="#1976D2" width="3" height="3"/>
                </svg>
              </div>
              <div>
                <h3 className="font-semibold">Google Calendar</h3>
                <p className="text-sm text-muted-foreground">
                  Two-way sync with real-time availability
                </p>
              </div>
            </div>
            {googleIntegration.connected ? (
              <Badge variant="default" className="bg-emerald-500">
                <span className="inline-block h-2 w-2 rounded-full bg-white mr-1 animate-pulse" />
                Connected
              </Badge>
            ) : (
              <Badge variant="secondary">Not Connected</Badge>
            )}
          </div>

          {googleIntegration.connected ? (
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                <p className="font-medium text-emerald-900 mb-2">✓ Sync Active</p>
                <ul className="space-y-1 text-emerald-800">
                  <li>• Bookings added to your Google Calendar</li>
                  <li>• Google Calendar busy times block availability</li>
                  <li>• Real-time conflict detection</li>
                </ul>
              </div>
              <p className="text-sm text-muted-foreground">
                Connected as: <span className="font-medium">{googleIntegration.email}</span>
              </p>

              {/* Calendar Preferences */}
              <div className="space-y-3 border-t pt-3">
                <p className="text-sm font-medium">Calendar Preferences</p>
                
                <div className="flex items-center justify-between py-2">
                  <div className="flex-1">
                    <p className="text-sm font-medium">Automatically add bookings</p>
                    <p className="text-xs text-muted-foreground">New bookings will be added to your calendar</p>
                  </div>
                  <Switch
                    checked={autoAddBookings}
                    onCheckedChange={(checked) => handlePreferenceChange('auto_add_bookings', checked)}
                    disabled={savingPreferences}
                  />
                </div>

                <div className="flex items-center justify-between py-2">
                  <div className="flex-1">
                    <p className="text-sm font-medium">Auto-create Google Meet links</p>
                    <p className="text-xs text-muted-foreground">Generate Google Meet links for all bookings</p>
                  </div>
                  <Switch
                    checked={autoCreateMeetLinks}
                    onCheckedChange={(checked) => handlePreferenceChange('auto_create_meet_links', checked)}
                    disabled={savingPreferences}
                  />
                </div>
              </div>

              <Button
                variant="destructive"
                size="sm"
                onClick={handleDisconnect}
                disabled={disconnecting}
              >
                {disconnecting ? "Disconnecting..." : "Disconnect Google Calendar"}
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              onClick={() => handleConnect("calendar")}
              disabled={loadingScope === "calendar"}
            >
              {loadingScope === "calendar" ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Connecting...
                </>
              ) : (
                "Connect Google Calendar"
              )}
            </Button>
          )}
        </Card>
      </div>
    </div>
  );
};
