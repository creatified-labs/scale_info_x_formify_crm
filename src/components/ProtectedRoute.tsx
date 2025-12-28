"use client";

import { ReactNode, useEffect, useState } from 'react';
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { detectWhopContext } from "@/lib/embed";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { user, loading } = useAuth();
  const [bootstrapChecking, setBootstrapChecking] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const [embedContext, setEmbedContext] = useState<"whop" | "direct">(() => {
    if (typeof window === "undefined") return "direct";
    return detectWhopContext() ? "whop" : "direct";
  });
  const [hasEverBeenReady, setHasEverBeenReady] = useState(false);

  const isWhopEmbed = embedContext === "whop";

  useEffect(() => {
    if (typeof window === "undefined") {
      setEmbedContext("direct");
      return;
    }

    const evaluate = () => {
      const next = detectWhopContext() ? "whop" : "direct";
      setEmbedContext((prev) => (prev === next ? prev : next));
      return next;
    };

    const initial = evaluate();
    if (initial === "whop") {
      return;
    }

    const interval = window.setInterval(() => {
      const result = evaluate();
      if (result === "whop") {
        window.clearInterval(interval);
      }
    }, 500);

    return () => {
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    let active = true;

    const ensureSession = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (!active) return;
        if (data.session) {
          setHasSession(true);
        } else {
          // keep polling briefly to allow bootstrap to finish
          setTimeout(ensureSession, 500);
        }
      } finally {
        if (active) {
          setBootstrapChecking(false);
        }
      }
    };

    if (embedContext === "whop") {
      ensureSession();
    } else if (embedContext === "direct") {
      setBootstrapChecking(false);
      setHasSession(false);
    }

    return () => {
      active = false;
    };
  }, [embedContext]);

  useEffect(() => {
    const emailVerified = Boolean(user?.email_confirmed_at);
    if (!hasEverBeenReady && embedContext === "whop" && user && emailVerified && hasSession && !bootstrapChecking) {
      setHasEverBeenReady(true);
    }
  }, [user, hasSession, bootstrapChecking, embedContext, hasEverBeenReady]);

  const emailVerified = Boolean(user?.email_confirmed_at);
  if (!isWhopEmbed && (loading || bootstrapChecking)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Connecting your workspace…</span>
        </div>
      </div>
    );
  }

  if (!user || !emailVerified) {
    return <>{children}</>;
  }

  return <>{children}</>;
}
