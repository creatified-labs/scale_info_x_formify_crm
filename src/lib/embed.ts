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
};

export function readWhopIdentity(): WhopIdentity {
  if (typeof window === "undefined") {
    return { orgId: null, email: null, name: null };
  }

  const w = window as any;
  const pathname = typeof window.location?.pathname === "string" ? window.location.pathname : "";

  const pathCompanyMatch = pathname.match(/\/dashboard\/([^/]+)/);

  const orgId =
    (typeof w.WHOP_ORG_ID === "string" && w.WHOP_ORG_ID) ||
    (typeof w.wapOrgId === "string" && w.wapOrgId) ||
    (typeof w.biz_id === "string" && w.biz_id) ||
    (pathCompanyMatch ? pathCompanyMatch[1] : null);

  const email =
    (typeof w.WHOP_EMAIL === "string" && w.WHOP_EMAIL) ||
    (typeof w.wapUserEmail === "string" && w.wapUserEmail) ||
    null;

  const name =
    (typeof w.WHOP_USERNAME === "string" && w.WHOP_USERNAME) ||
    (typeof w.wapUserName === "string" && w.wapUserName) ||
    null;

  return {
    orgId,
    email,
    name,
  };
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
