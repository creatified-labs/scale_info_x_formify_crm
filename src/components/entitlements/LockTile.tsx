"use client";

import { Button } from "@/components/ui/button";
import { Lock, ExternalLink } from "lucide-react";
import { useEffect, useState } from "react";
import { ENV, type PlanKey } from "@/lib/env";
import { track } from "@/lib/track";
import { useUpgrade } from "@/lib/entitlements/client";
import { detectWhopContext } from "@/lib/embed";
import { openWhopCheckout } from "@/lib/whopCheckout";

export function LockTile({ title, description, primaryLabel, primaryPlan }: { title: string; description: string; primaryLabel?: string; primaryPlan?: PlanKey; }) {
  const soloPlan = ENV.client.NEXT_PUBLIC_WHOP_PLAN_SOLO;
  const proPlan = ENV.client.NEXT_PUBLIC_WHOP_PLAN_PRO;
  const { startTrial } = useUpgrade();
  const [loading, setLoading] = useState<PlanKey | null>(null);
  const isWhop = typeof window !== "undefined" && detectWhopContext();

  useEffect(() => {
    track("locktile_view", { title });
  }, [title]);

  async function handlePrimaryClick() {
    if (!primaryPlan) {
      if (typeof window !== "undefined") {
        window.location.assign("/pricing");
      }
      return;
    }

    try {
      setLoading(primaryPlan);
      track("locktile_trial_click", { plan: primaryPlan });

      if (isWhop) {
        const started = await openWhopCheckout(primaryPlan);
        if (started) {
          return;
        }
      }

      await startTrial(primaryPlan);
    } catch (_e) {
      track("locktile_trial_failed", { plan: primaryPlan });
    } finally {
      setLoading(null);
    }
  }

  async function handleSecondaryClick() {
    try {
      setLoading("pro");
      track("locktile_trial_click", { plan: "pro" });

      if (isWhop) {
        const started = await openWhopCheckout("pro");
        if (started) {
          return;
        }
      }

      await startTrial("pro");
    } catch (_e) {
      track("locktile_trial_failed", { plan: "pro" });
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="p-4 border rounded-lg bg-muted/30">
      <div className="flex items-center gap-3 mb-2">
        <Lock className="w-4 h-4 text-primary" />
        <div className="font-medium">{title}</div>
      </div>
      <p className="text-sm text-muted-foreground mb-3">{description}</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <Button className="w-full" onClick={handlePrimaryClick} disabled={loading !== null}>
          {loading === primaryPlan ? "Starting..." : primaryLabel ?? "Start Solo trial (7d)"}
        </Button>
        <Button variant="secondary" className="w-full" onClick={handleSecondaryClick} disabled={loading !== null}>
          {loading === "pro" ? "Starting..." : "Start Pro trial (7d)"}
        </Button>
      </div>
      {(soloPlan || proPlan) && (
        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
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
    </div>
  );
}
