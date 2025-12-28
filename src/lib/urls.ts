const FALLBACK_PUBLIC_ORIGIN = "https://formifycrm.com";
export const DEFAULT_PRODUCT_SEGMENT = "formifycrm";

let configuredProductSegment: string = DEFAULT_PRODUCT_SEGMENT;

function normalizePrefix(value?: string | null) {
  if (!value) return DEFAULT_PRODUCT_SEGMENT;
  const normalized = value.toLowerCase().trim();
  if (!normalized) return DEFAULT_PRODUCT_SEGMENT;
  const cleaned = normalized.replace(/[^a-z0-9]/g, "").slice(0, 32);
  return cleaned || DEFAULT_PRODUCT_SEGMENT;
}

function getBookingPathBase() {
  return `/book/${configuredProductSegment}`;
}

export function configureBookingBranding(options?: {
  productName?: string | null;
  planId?: string | null;
  fallbackPrefix?: string | null;
}) {
  const fallbackPrefix = normalizePrefix(options?.fallbackPrefix);
  configuredProductSegment = fallbackPrefix;
}

export function getPublicOrigin() {
  if (typeof window === "undefined") {
    return FALLBACK_PUBLIC_ORIGIN;
  }

  const envOrigin = process.env.NEXT_PUBLIC_APP_URL;
  if (envOrigin && typeof envOrigin === "string" && envOrigin.trim().length > 0) {
    return envOrigin.replace(/\/$/, "");
  }

  return FALLBACK_PUBLIC_ORIGIN;
}

export function getBookingPathPrefix() {
  return `${getBookingPathBase()}/`;
}

export function getBookingDisplayBase() {
  return `${getPublicOrigin()}${getBookingPathPrefix()}`;
}

export function buildBookingPath(slug?: string | null) {
  const sanitizedSlug = (slug ?? "").toString().trim().replace(/^\/+/, "");
  const base = getBookingPathBase();
  if (!sanitizedSlug) {
    return `${base}/`;
  }
  return `${base}/${sanitizedSlug}`;
}

export function buildBookingUrl(slug: string) {
  return `${getPublicOrigin()}${buildBookingPath(slug)}`;
}
