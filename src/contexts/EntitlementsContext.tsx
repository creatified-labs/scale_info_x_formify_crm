"use client";

async function ensureProPlanForCompany(companyId: string, currentPlan: string): Promise<string> {
  if (currentPlan !== "preview") {
    return currentPlan;
  }

  try {
    await fetch('/api/edge-proxy', {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        functionName: 'ensure-company',
        payload: { name: null },
        method: 'POST',
      }),
    }).catch(err => {
      console.error("ensure-company invocation failed", err);
    });

    const { data } = await (supabase as any)
      .from("companies")
      .select("plan_id")
      .eq("id", companyId)
      .maybeSingle();
    const nextPlan = (data?.plan_id as string) || "pro";
    return nextPlan;
  } catch (error) {
    console.error("ensureProPlanForCompany error", error);
    return currentPlan;
  }
}

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { usePreviewMode, type PreviewModeState } from "@/components/PreviewModeToggle";
import { getCompanyId } from "@/lib/company";
import { useAuth } from "@/contexts/AuthContext";

export type Entitlements = {
  plan_id: "preview" | "solo" | "pro" | "expert";
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

const PREVIEW_ENTITLEMENTS: Entitlements = {
  plan_id: "preview",
  users_seats_max: 1,
  scheduling_capacity: {
    events_max: 1,
    bookings_per_month_max: 10,
  },
  integrations_bundle: "basic", // no integrations
  questions_forms_max: 2,
  call_tracking: "basic",
  goals_management: "personal",
  analytics_revenue: "basic",
  exports_automations: false,
  branding_domain: "powered_by_badge", // watermark on
  support: "email_72h",
};
const SOLO_ENTITLEMENTS: Entitlements = {
  plan_id: "solo",
  users_seats_max: 1,
  scheduling_capacity: {
    events_max: 3,
    bookings_per_month_max: 30,
  },
  integrations_bundle: "basic",
  questions_forms_max: 3,
  call_tracking: "included",
  goals_management: "personal",
  analytics_revenue: "basic",
  exports_automations: false,
  branding_domain: "powered_by_badge",
  support: "email_72h",
};

const PRO_ENTITLEMENTS: Entitlements = {
  plan_id: "pro",
  users_seats_max: 5,
  scheduling_capacity: {
    events_max: 10,
    bookings_per_month_max: 120,
  },
  integrations_bundle: "included",
  questions_forms_max: "unlimited",
  call_tracking: "included",
  goals_management: "included",
  analytics_revenue: "advanced",
  exports_automations: "csv_webhooks",
  branding_domain: "custom_1",
  support: "priority_24_48h",
};

type EntitlementsContextType = {
  entitlements: Entitlements;
  loading: boolean;
  refetch: () => Promise<void>;
};

const EntitlementsContext = createContext<EntitlementsContextType | null>(null);

export function EntitlementsProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [entitlements, setEntitlements] = useState<Entitlements>(PRO_ENTITLEMENTS);
  const [loading, setLoading] = useState(true);
  const previewMode = usePreviewMode();
  const [isEmbed, setIsEmbed] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const embedded = (() => {
      try {
        return window.self !== window.top;
      } catch {
        return true;
      }
    })();
    setIsEmbed(embedded);
  }, []);

  const fetchEntitlements = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setEntitlements(PRO_ENTITLEMENTS);
        setLoading(false);
        return;
      }

      // Resolve company for this user
      const companyId = await getCompanyId({ allowFallback: false });

      if (!companyId) {
        setEntitlements(PRO_ENTITLEMENTS);
        setLoading(false);
        return;
      }

      const companyQuery = await (supabase as any)
        .from('companies')
        .select('id, plan_id')
        .eq('id', companyId)
        .maybeSingle();

      if (companyQuery.error || !companyQuery.data) {
        setEntitlements(PRO_ENTITLEMENTS);
      } else {
        let planRaw = (companyQuery.data.plan_id as string) || 'preview';

        if (planRaw === 'preview') {
          planRaw = await ensureProPlanForCompany(companyId, planRaw);
        }

        const normalizedPlan = planRaw === 'preview' ? 'pro' : (planRaw as 'solo' | 'pro');
        const mapped = normalizedPlan === 'pro' ? PRO_ENTITLEMENTS : SOLO_ENTITLEMENTS;
        setEntitlements(mapped);
      }
    } catch (error) {
      console.error("Error fetching entitlements:", error);
      setEntitlements(PRO_ENTITLEMENTS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading) {
      return;
    }
    fetchEntitlements();
  }, [authLoading, user?.id]);

  // Apply preview mode override only when explicitly set; otherwise use fetched entitlements
  const allowPreviewOverride = !isEmbed;

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!allowPreviewOverride) return;

    if (entitlements.plan_id === "preview") {
      const stored = window.localStorage.getItem("previewMode");
      if (stored !== "preview") {
        window.localStorage.setItem("previewMode", "preview");
        window.dispatchEvent(new CustomEvent<PreviewModeState>("previewModeChange", { detail: "preview" }));
      }
    }
  }, [allowPreviewOverride, entitlements.plan_id]);

  const effectiveEntitlements =
    allowPreviewOverride && previewMode === "solo" ? SOLO_ENTITLEMENTS :
    allowPreviewOverride && previewMode === "pro" ? PRO_ENTITLEMENTS :
    entitlements;

  return (
    <EntitlementsContext.Provider
      value={{
        entitlements: effectiveEntitlements,
        loading,
        refetch: fetchEntitlements,
      }}
    >
      {children}
    </EntitlementsContext.Provider>
  );
}

export function useEntitlements() {
  const context = useContext(EntitlementsContext);
  if (!context) {
    throw new Error("useEntitlements must be used within EntitlementsProvider");
  }
  return context;
}
