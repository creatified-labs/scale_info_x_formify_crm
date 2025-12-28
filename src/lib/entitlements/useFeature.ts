import { useMemo } from "react";
import { useEntitlements } from "@/contexts/EntitlementsContext";

type Plan = "preview" | "solo" | "pro";

export function useFeature() {
  const { entitlements } = useEntitlements();
  const plan = (entitlements?.plan_id ?? "preview") as Plan;

  const features = useMemo(() => {
    // Phase 2: SOLO plan
    // - integrations: solo/pro
    // - csvExport: pro only
    // - removeWatermark: pro only
    const integrations    = plan === "pro";
    const csvExport       = plan === "pro";
    const removeWatermark = plan === "pro";
    return { integrations, csvExport, removeWatermark };
  }, [plan]);

  function require<K extends keyof typeof features>(key: K) {
    return features[key];
  }

  return { plan, ...features, require };
}
