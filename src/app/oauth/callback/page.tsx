"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

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

      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;

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

      // For local development, allow OAuth without prior authentication
      const isLocalDev = typeof window !== "undefined" &&
        (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");

      if (!token && !isLocalDev) {
        setStatus("error");
        setMessage("Authentication required. Please access this app through Whop.");
        setTimeout(() => router.replace("/scheduling"), 2000);
        return;
      }

      try {
        const edgeFunctionUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/google-exchange-token`;
        console.log("Calling Edge Function:", edgeFunctionUrl, "with code:", code?.substring(0, 20) + "...");

        const res = await fetch(edgeFunctionUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ code }),
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
        setTimeout(() => router.replace("/scheduling"), 1200);
      } catch (e: any) {
        setStatus("error");
        setMessage(e?.message || "Failed to connect Google");
      }
    })();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <Card className="p-6 max-w-md w-full text-center space-y-3">
        {status === "working" && <p>Connecting your Google account…</p>}
        {status === "done" && <p>Connected! Redirecting…</p>}
        {status === "error" && (
          <>
            <p className="text-destructive">Connection failed</p>
            {message && <p className="text-sm text-muted-foreground">{message}</p>}
            <Button onClick={() => router.push("/scheduling")}>Back to Scheduling</Button>
          </>
        )}
      </Card>
    </div>
  );
};

export default OAuthCallback;
