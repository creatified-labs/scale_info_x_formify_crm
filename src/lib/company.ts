import { supabase } from "@/integrations/supabase/client";

const LOCAL_STORAGE_KEY = "formify-dev-company-id";
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isLocalhost() {
  if (typeof window === "undefined") return false;
  const hostname = window.location.hostname;
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname.endsWith(".local");
}

function getEnvCompanyId(): string | null {
  const envValue =
    process.env.NEXT_PUBLIC_LOCAL_COMPANY_ID_BYPASS ||
    process.env.NEXT_PUBLIC_DEV_COMPANY_ID ||
    null;

  if (!envValue || typeof envValue !== "string") return null;

  const trimmed = envValue.trim();
  if (!UUID_REGEX.test(trimmed)) {
    return null;
  }

  return trimmed;
}

function getStoredCompanyId(): string | null {
  if (!isLocalhost() || typeof window === "undefined") return null;

  const stored = window.localStorage.getItem(LOCAL_STORAGE_KEY);
  if (!stored) return null;

  if (UUID_REGEX.test(stored) || stored.startsWith("dev-company-")) {
    return stored;
  }

  return null;
}

function cacheLocalCompanyId(companyId: string | null | undefined) {
  if (!companyId || !isLocalhost() || typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LOCAL_STORAGE_KEY, companyId);
  } catch (error) {
    console.warn("Failed to cache local company id", error);
  }
}

function ensureLocalDevCompanyId(): string | null {
  if (!isLocalhost() || typeof window === "undefined") return null;

  const existing = window.localStorage.getItem(LOCAL_STORAGE_KEY);
  if (existing && existing.startsWith("dev-company-")) {
    return existing;
  }

  try {
    const suffix = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now()}`;
    const generated = `dev-company-${suffix}`;
    window.localStorage.setItem(LOCAL_STORAGE_KEY, generated);
    return generated;
  } catch (error) {
    console.warn("Failed to generate local company id", error);
    return null;
  }
}

async function ensureCompanyIdViaEdge(): Promise<string | null> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) return null;

  const base =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!base || !anon) return null;

  const currentUser = (await supabase.auth.getUser()).data.user;
  const desiredName =
    (currentUser?.user_metadata as any)?.company_name ??
    (currentUser?.user_metadata as any)?.name ??
    null;

  const res = await fetch(`${base}/functions/v1/ensure-company`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      apikey: anon as string,
    },
    body: JSON.stringify({ name: desiredName }),
  }).catch((error) => {
    console.warn("ensure-company request failed (non-critical):", error);
    return null;
  });

  if (!res || !res.ok) {
    if (res) {
      try {
        const body = await res.json();
        console.warn("ensure-company failed (non-critical):", body);
      } catch (err) {
        console.warn("ensure-company unable to parse error (non-critical):", err);
      }
    }
    // Don't throw errors - just return null and let Whop bootstrap handle it
    return null;
  }

  try {
    await supabase.auth.refreshSession();
  } catch (err) {
    console.warn("refreshSession after ensure-company failed", err);
  }

  const refreshedUser = (await supabase.auth.getUser()).data.user;
  const companyId = (refreshedUser?.user_metadata as any)?.company_id ?? null;
  cacheLocalCompanyId(companyId ?? undefined);
  return companyId;
}

type GetCompanyIdOptions = {
  allowFallback?: boolean;
};

export async function getCompanyId(options?: GetCompanyIdOptions): Promise<string | null> {
  const allowFallback = options?.allowFallback ?? true;

  const envCompanyId = getEnvCompanyId();
  if (envCompanyId) {
    console.log('[getCompanyId] ✅ Using env company ID:', envCompanyId);
    return envCompanyId;
  }

  // PRIORITY 1: Check user metadata first (most reliable source)
  const { data: { user } } = await supabase.auth.getUser();
  console.log('[getCompanyId] Checking user metadata:', {
    hasUser: !!user,
    userId: user?.id,
    companyId: (user?.user_metadata as any)?.company_id,
    whop_org_id: (user?.user_metadata as any)?.whop_org_id,
  });

  if (user) {
    const cid = (user.user_metadata as any)?.company_id as string | undefined;
    if (cid) {
      // Cache it for future use
      cacheLocalCompanyId(cid);
      console.log('[getCompanyId] ✅ Found company ID in user metadata:', cid);
      return cid;
    } else {
      // This is a critical issue - user exists but has no company_id
      console.error('[getCompanyId] ❌ User exists but has NO company_id in metadata!', {
        userId: user.id,
        email: user.email,
        whop_org_id: (user.user_metadata as any)?.whop_org_id,
        metadata_keys: Object.keys(user.user_metadata || {}),
        hint: 'User may need re-authentication to get company_id populated',
      });
    }
  } else {
    console.warn('[getCompanyId] ⚠️ No authenticated user found');
  }

  // PRIORITY 2: Check localStorage only if user metadata doesn't have it
  const storedCompanyId = getStoredCompanyId();
  if (storedCompanyId) {
    if (!allowFallback && storedCompanyId.startsWith("dev-company-")) {
      // Ignore dev placeholders when fallback is disabled
    } else {
      return storedCompanyId;
    }
  }

  if (!user) return null;

  // NOTE: NEXT_PUBLIC_WHOP_COMPANY_ID is the Whop biz_id (e.g. "biz_xxx"), NOT a Supabase company UUID
  // We should NEVER return it directly as company_id for database operations
  // The dev-auth endpoint uses it to find/create the actual company record and sets the UUID in user metadata

  const ensuredCompanyId = await ensureCompanyIdViaEdge();
  if (ensuredCompanyId) {
    if (!allowFallback && !UUID_REGEX.test(ensuredCompanyId)) {
      return null;
    }
    return ensuredCompanyId;
  }

  if (allowFallback) {
    console.log('[getCompanyId] No company ID found, generating fallback');
    const generated = ensureLocalDevCompanyId();
    if (generated) {
      cacheLocalCompanyId(generated);
      console.log('[getCompanyId] Generated fallback company ID:', generated);
      return generated;
    }
  }

  console.error('[getCompanyId] ❌ No company ID found and no fallback available');
  return null;
}
