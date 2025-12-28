"use client";

import { useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Lock, Loader2 } from "lucide-react";
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
      setLoadingScope(scope);
      
      // Store Whop identity for OAuth callback to use
      const { detectWhopContext, readWhopIdentity } = await import('@/lib/embed');
      if (detectWhopContext()) {
        const identity = readWhopIdentity();
        sessionStorage.setItem('whop_oauth_identity', JSON.stringify(identity));
      }
      
      // Use direct Google OAuth flow (works in both Whop iframe and standalone)
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;
      const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/google-auth-url?scope=${scope}`;
      
      const res = await fetch(url, { 
        method: 'GET', 
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) } 
      });
      
      if (!res.ok) {
        const errorText = await res.text();
        console.error('Google auth URL error:', errorText);
        throw new Error('Failed to start Google auth');
      }
      
      const j = await res.json();
      if (!j?.url) throw new Error('Missing auth URL');

      // Redirect in same window to stay in Whop iframe context
      window.location.href = j.url;
    } catch (e) {
      console.error('connect-integration:', e);
      toast.error('Failed to start Google authentication');
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
              <img
                src="https://www.google.com/calendar/images/ext/gc_button1_en.gif"
                alt="Google Calendar"
                className="w-9 h-9 rounded"
              />
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
            <div className="space-y-3">
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
