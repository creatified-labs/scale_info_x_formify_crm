import { createAppIframeSDK } from "@whop-apps/iframe";

interface StartWhopOAuthOptions {
  provider: "google" | "zoom";
  scope?: string;
  restPath?: string;
}

function isInWhopIframe(): boolean {
  if (typeof window === "undefined") return false;
  
  // Check if we're in an iframe
  const inIframe = window.self !== window.top;
  
  // Check if parent is Whop domain
  try {
    const parentHostname = window.location !== window.parent.location 
      ? document.referrer 
      : document.location.href;
    return inIframe && (parentHostname.includes('whop.com') || parentHostname.includes('dash.whop.com'));
  } catch {
    // Cross-origin restriction means we're likely in an iframe
    return inIframe;
  }
}

export async function startWhopOAuth({ provider, scope, restPath = "/oauth_callback" }: StartWhopOAuthOptions) {
  // Check if running in Whop iframe context
  if (!isInWhopIframe()) {
    throw new Error(
      "Whop OAuth only works when the app is embedded in Whop's dashboard. " +
      "For local development, use the direct Google OAuth flow instead."
    );
  }

  const appId = process.env.NEXT_PUBLIC_WHOP_APP_ID;

  if (!appId) {
    throw new Error("Missing NEXT_PUBLIC_WHOP_APP_ID; set it in .env.local");
  }

  const sdk = createAppIframeSDK({ appId });
  const { baseHref } = await sdk.getTopLevelUrlData({});
  const normalizedRestPath = restPath?.replace(/^\//, "") ?? "";
  const fullUrl = new URL(baseHref + normalizedRestPath);
  const pathname = encodeURIComponent(fullUrl.pathname + fullUrl.search);

  const redirectUrl = new URL(`/_whop/oauth/oauth/${provider}/init`, window.location.origin);
  if (scope) {
    redirectUrl.searchParams.set("scope", scope);
  }
  redirectUrl.searchParams.set("redirect", pathname);

  await sdk.openExternalUrl({ url: redirectUrl.toString() });
}
