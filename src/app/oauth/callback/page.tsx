"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { detectWhopContext, readWhopIdentity } from "@/lib/embed";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";

const OAuthCallback = () => {
  const [status, setStatus] = useState<"idle" | "working" | "done" | "error">("idle");
  const [message, setMessage] = useState<string>("");
  const router = useRouter();

  useEffect(() => {
    (async () => {
      setStatus("working");
      const searchParams = new URLSearchParams(window.location.search);
      const hashParams = window.location.hash ? new URLSearchParams(window.location.hash.slice(1)) : null;
      const error = searchParams.get("error") || hashParams?.get("error");
      const errorDescription = searchParams.get("error_description") || hashParams?.get("error_description");
      if (error || errorDescription) {
        setStatus("error");
        setMessage(errorDescription || error || "OAuth error");
        return;
      }

      const code = searchParams.get("code") || hashParams?.get("code");
      const state = searchParams.get("state") || hashParams?.get("state");

      console.log("=== OAuth Callback Debug ===");
      console.log("Code:", code?.substring(0, 20) + "...");
      console.log("State:", state?.substring(0, 20) + "...");
      console.log("Note: Whop identity is passed via OAuth state parameter");

      let { data: session } = await supabase.auth.getSession();
      let token = session?.session?.access_token;

      console.log("User session status:", { hasSession: !!session?.session, hasToken: !!token });

      if (!code) {
        if (session?.session) {
          setStatus("done");
          setTimeout(() => router.replace("/scheduling"), 800);
          return;
        }
        setStatus("error");
        setMessage("Missing code");
        return;
      }

      // For local development, auto-authenticate if no session exists
      const isLocalDev = typeof window !== "undefined" &&
        (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");

      if (!token && isLocalDev) {
        // Redirect to dev-auth to create a session, then come back
        setStatus("working");
        setMessage("Creating local session...");
        window.location.href = `/api/dev-auth?returnTo=${encodeURIComponent(`/oauth/callback?code=${code}`)}`;
        return;
      }

      try {
        console.log("Calling google-exchange-token via edge-proxy with code:", code?.substring(0, 20) + "...");

        const res = await fetch('/api/edge-proxy', {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            functionName: 'google-exchange-token',
            payload: { code, state },
            method: 'POST',
          }),
        });

        console.log("Edge Function response status:", res.status, res.statusText);

        if (!res.ok) {
          const responseText = await res.text();
          console.error("Edge Function error response (text):", responseText);

          let j: any = {};
          try {
            j = JSON.parse(responseText);
          } catch (e) {
            console.error("Failed to parse error response as JSON");
          }

          // Check if integration was actually stored despite error response
          // This can happen if the token exchange succeeded but there was a session issue
          if (j?.tokens?.access_token && j?.tokens?.email) {
            console.log('⚠️ Got error response but tokens were returned - integration may have succeeded');
            console.log('Connected email:', j.tokens.email);

            // Check if integration exists in database
            const { data: integration } = await supabase
              .from('user_integrations')
              .select('email')
              .eq('provider', 'google')
              .maybeSingle();

            if (integration) {
              console.log('✅ Integration confirmed in database - showing success');
              setStatus("done");
              setMessage("Google Calendar connected successfully! You can close this tab and return to Whop.");
              return;
            }
          }

          const errorMsg = j?.detail || j?.error || `Exchange failed (HTTP ${res.status}): ${responseText.substring(0, 100)}`;
          console.error("OAuth exchange error:", { status: res.status, statusText: res.statusText, response: j, rawText: responseText });
          throw new Error(errorMsg);
        }
        await supabase.auth.getSession();
        const { data: userResult } = await supabase.auth.getUser();
        const emailConfirmed = Boolean(userResult?.user?.email_confirmed_at || userResult?.user?.confirmed_at);

        if (!userResult?.user) {
          setStatus("error");
          setMessage("We couldn’t finish signing you in. Please try again.");
          return;
        }

        if (!emailConfirmed) {
          setStatus("error");
          setMessage("Check your email inbox to confirm your account, then try signing in again.");
          return;
        }

        setStatus("done");
        setMessage("Google Calendar connected successfully! You can close this tab and return to Whop.");
        // Don't auto-redirect - let user close the popup manually
      } catch (e: any) {
        setStatus("error");
        setMessage(e?.message || "Failed to connect Google");
      }
    })();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <Card className="p-6 max-w-md w-full text-center space-y-4">
        {status === "working" && (
          <>
            <Loader2 className="w-12 h-12 mx-auto animate-spin text-blue-500" />
            <p className="text-lg font-medium">Connecting...</p>
          </>
        )}
        {status === "done" && (
          <>
            <CheckCircle2 className="w-12 h-12 mx-auto text-green-500" />
            <p className="text-lg font-medium text-green-600">Google Calendar Connected!</p>
            <p className="text-sm text-gray-600">You can now close this tab and return to Whop.</p>
            <Button 
              onClick={() => window.close()} 
              className="mt-4"
              variant="outline"
            >
              Close Tab
            </Button>
          </>
        )}
        {status === "error" && (
          <>
            <XCircle className="w-12 h-12 mx-auto text-red-500" />
            <p className="text-lg font-medium text-red-600">Connection failed</p>
            <p className="text-sm text-gray-600">{message}</p>
            <Button onClick={() => window.close()} className="mt-4" variant="outline">
              Close Tab
            </Button>
          </>
        )}
      </Card>
    </div>
  );
};

export default OAuthCallback;
