"use client";

import { ReactNode, useState } from "react";
import { Button } from "@/components/ui/button";
import { Lock, ExternalLink, CheckCircle2 } from "lucide-react";
import { useUpgrade } from "@/lib/entitlements/client";
import { ENV } from "@/lib/env";
import { detectWhopContext } from "@/lib/embed";

export function Gate({ children, isAllowed, featureName }: { children: ReactNode; isAllowed: boolean; featureName: string; }) {
  const { startTrial } = useUpgrade();
  const [loading, setLoading] = useState<"solo" | "pro" | null>(null);
  const isWhop = typeof window !== "undefined" && detectWhopContext();

  if (isAllowed) return <>{children}</>;

  const soloPlan = ENV.client.NEXT_PUBLIC_WHOP_PLAN_SOLO;
  const proPlan = ENV.client.NEXT_PUBLIC_WHOP_PLAN_PRO;

  async function handleStart(plan: "solo" | "pro") {
    try {
      setLoading(plan);
      await startTrial(plan);
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="relative">
      <div className="blur-sm pointer-events-none select-none">
        {children}
      </div>
      <div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-sm">
        <div className="text-center space-y-4 p-6 max-w-md">
          <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
            <Lock className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-2xl font-bold">Unlock {featureName}</h2>
          <p className="text-muted-foreground">Start a 7‑day trial. No commitment.</p>
          {!isWhop && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Button onClick={() => handleStart("solo")} disabled={loading !== null} className="w-full" variant="default">
                {loading === "solo" ? "Starting..." : "Start Solo trial (7d)"}
              </Button>
              <Button onClick={() => handleStart("pro")} disabled={loading !== null} className="w-full" variant="secondary">
                {loading === "pro" ? "Starting..." : "Start Pro trial (7d)"}
              </Button>
            </div>
          )}
          {(soloPlan || proPlan) && (
            <div className="flex items-center justify-center gap-3 text-xs text-muted-foreground">
              {soloPlan && (
                <a href={`https://whop.com/plans/${soloPlan}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:underline">
                  <ExternalLink className="w-3 h-3" /> Open Solo in Whop
                </a>
              )}
              {proPlan && (
                <a href={`https://whop.com/plans/${proPlan}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:underline">
                  <ExternalLink className="w-3 h-3" /> Open Pro in Whop
                </a>
              )}
            </div>
          )}
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <CheckCircle2 className="w-3 h-3" /> 7‑day trial for both plans
          </div>
        </div>
      </div>
    </div>
  );
}
