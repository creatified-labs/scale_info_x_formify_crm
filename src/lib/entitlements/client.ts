import { useCallback } from "react";
import { useEntitlements } from "@/contexts/EntitlementsContext";
import { track } from "@/lib/track";

export type PlanTier = "solo" | "pro";

export function useUpgrade() {
  const { refetch } = useEntitlements();

  const startTrial = useCallback(async (plan: PlanTier) => {
    const res = await fetch('/api/edge-proxy', {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        functionName: 'start-trial',
        payload: { plan_id: plan },
        method: 'POST',
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Failed to start trial" }));
      track("trial_failed", { plan, error: true });
      throw new Error(err.error || "Failed to start trial");
    }

    const data = (await res.json()) as { plan_id: PlanTier; trial_days: number };

    await refetch();
    track("trial_started", { plan });
    return data.plan_id;
  }, [refetch]);

  return { startTrial };
}
