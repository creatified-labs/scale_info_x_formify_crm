"use client";

import { useContext } from "react";
import { useEntitlements as useEntitlementsContext } from "@/contexts/EntitlementsContext";

export type Entitlements = {
  plan_id: "solo" | "pro" | "expert";
  users_seats_max: number;
  scheduling_capacity: {
    events_max: number;
    bookings_per_month_max: number;
  };
  integrations_bundle: "basic" | "included" | "advanced";
  questions_forms_max: number | "unlimited";
  call_tracking: "basic" | "included";
  goals_management: "personal" | "included";
  analytics_revenue: "basic" | "advanced";
  exports_automations: false | "csv_webhooks" | "advanced_api";
  branding_domain: "powered_by_badge" | "custom_1" | "whitelabel_multi";
  support: "email_72h" | "priority_24_48h" | "24_7_manager_chat";
};

export function useEntitlements() {
  const context = useEntitlementsContext();
  
  const checkLimit = (feature: keyof Entitlements, currentCount?: number): {
    allowed: boolean;
    limit: number | string;
    current?: number;
  } => {
    const limit = context.entitlements[feature];
    
    if (limit === "unlimited" || limit === "included" || limit === "advanced") {
      return { allowed: true, limit: "unlimited", current: currentCount };
    }
    
    if (typeof limit === "number" && typeof currentCount === "number") {
      return {
        allowed: currentCount < limit,
        limit,
        current: currentCount
      };
    }
    
    if (typeof limit === "object" && limit !== null) {
      return { allowed: true, limit: "object", current: currentCount };
    }
    
    return { allowed: !!limit, limit: String(limit), current: currentCount };
  };

  return {
    entitlements: context.entitlements,
    loading: context.loading,
    refetch: context.refetch,
    checkLimit,
    hasFeature: (feature: keyof Entitlements) => {
      const value = context.entitlements[feature];
      return value !== false && value !== "powered_by_badge" && value !== "basic";
    }
  };
}
