// Centralized env loader for client-safe and server-only variables
// Note: In Next.js, variables prefixed with NEXT_PUBLIC_ are exposed to the client at build time.

export const ENV = {
  client: {
    SUPABASE_URL:
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    NEXT_PUBLIC_WHOP_REDIRECT:
      process.env.NEXT_PUBLIC_WHOP_REDIRECT || '',
    NEXT_PUBLIC_WHOP_PLAN_SOLO:
      process.env.NEXT_PUBLIC_WHOP_PLAN_SOLO || '',
    NEXT_PUBLIC_WHOP_PLAN_PRO:
      process.env.NEXT_PUBLIC_WHOP_PLAN_PRO || '',
  },
};

export type PlanKey = "solo" | "pro";
