import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useEntitlements } from "@/contexts/EntitlementsContext";
import { track } from "@/lib/track";

export type PlanTier = "solo" | "pro";

export function useUpgrade() {
  const { refetch } = useEntitlements();

  const startTrial = useCallback(async (plan: PlanTier) => {
    const { data: session } = await supabase.auth.getSession();
    const token = session?.session?.access_token;
    if (!token) {
      throw new Error("Not authenticated");
    }

    const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/start-trial`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({ plan_id: plan }),
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
