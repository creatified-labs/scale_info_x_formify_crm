export function detectWhopContext(): boolean {
  if (typeof window === "undefined") return false;

  const markers = Boolean(
    (window as any).wapOrgId ||
      (window as any).WHOP_ORG_ID ||
      (window as any).biz_id ||
      (window as any).WHOP_EMAIL ||
      (window as any).wapContext === "wap"
  );

  const embedded = window.self !== window.top;

  if (markers || embedded) {
    return true;
  }

  try {
    const { hostname, pathname } = window.location;
    const whopHost = hostname === "whop.com" || hostname.endsWith(".whop.com");
    const whopPath = /\/dashboard\//.test(pathname) || /\/apps\//.test(pathname);
    if (whopHost && whopPath) {
      return true;
    }
  } catch {
    // ignore URL inspection errors and fall through to false
  }

  return false;
}

export type WhopIdentity = {
  orgId: string | null;
  email: string | null;
  name: string | null;
  username: string | null;
  profilePicture: string | null;
  userId: string | null;
};

export function readWhopIdentity(): WhopIdentity {
  if (typeof window === "undefined") {
    return { orgId: null, email: null, name: null, username: null, profilePicture: null, userId: null };
  }

  const w = window as any;
  const pathname = typeof window.location?.pathname === "string" ? window.location.pathname : "";

  // Debug logging to see what's available
  console.log('[readWhopIdentity] Window variables:', {
    WHOP_ORG_ID: w.WHOP_ORG_ID,
    wapOrgId: w.wapOrgId,
    biz_id: w.biz_id,
    pathname,
    allWhopVars: Object.keys(w).filter(k => k.toLowerCase().includes('whop') || k.toLowerCase().includes('wap') || k.toLowerCase().includes('biz'))
  });

  const pathCompanyMatch = pathname.match(/\/dashboard\/([^/]+)/);

  const orgId =
    (typeof w.WHOP_ORG_ID === "string" && w.WHOP_ORG_ID) ||
    (typeof w.wapOrgId === "string" && w.wapOrgId) ||
    (typeof w.biz_id === "string" && w.biz_id) ||
    (pathCompanyMatch ? pathCompanyMatch[1] : null);

  console.log('[readWhopIdentity] Resolved orgId:', orgId, 'from pathMatch:', pathCompanyMatch?.[1]);

  const email =
    (typeof w.WHOP_EMAIL === "string" && w.WHOP_EMAIL) ||
    (typeof w.wapUserEmail === "string" && w.wapUserEmail) ||
    null;

  const name =
    (typeof w.WHOP_USERNAME === "string" && w.WHOP_USERNAME) ||
    (typeof w.wapUserName === "string" && w.wapUserName) ||
    (typeof w.WHOP_NAME === "string" && w.WHOP_NAME) ||
    null;

  const username =
    (typeof w.WHOP_USERNAME === "string" && w.WHOP_USERNAME) ||
    null;

  const profilePicture =
    (typeof w.WHOP_PROFILE_PICTURE === "string" && w.WHOP_PROFILE_PICTURE) ||
    (typeof w.wapUserAvatar === "string" && w.wapUserAvatar) ||
    null;

  const userId =
    (typeof w.WHOP_USER_ID === "string" && w.WHOP_USER_ID) ||
    (typeof w.wapUserId === "string" && w.wapUserId) ||
    null;

  const identity = {
    orgId,
    email,
    name,
    username,
    profilePicture,
    userId,
  };

  console.log('[readWhopIdentity] Final identity:', identity);
  return identity;
}

export function getCurrentWhopAppUrl(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const { origin, pathname } = window.location;
    const match = pathname.match(/^(\/dashboard\/[^/]+\/apps\/app_[^/]+)(?:\/.*)?$/);
    if (match && match[1]) {
      return `${origin}${match[1]}`;
    }
  } catch (_err) {
    // ignore – return null below
  }

  return null;
}

/**
 * Auto-authenticate for localhost development
 * Uses the company ID from environment variables
 */
export async function ensureLocalDevAuth() {
  if (typeof window === "undefined") return false;
  
  const isLocalhost = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
  if (!isLocalhost) return false;

  const companyId = process.env.NEXT_PUBLIC_WHOP_COMPANY_ID;
  if (!companyId) return false;

  try {
    const response = await fetch(`/api/dev-auth-v2?companyId=${companyId}`);
    if (response.ok) {
      return true;
    }
  } catch (error) {
    console.error("Failed to auto-authenticate:", error);
  }
  
  return false;
}
