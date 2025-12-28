const WHOP_API_BASE = "https://api.whop.com";

export type WhopBusinessOwner = {
  email?: string | null;
  name?: string | null;
};

export type WhopBusiness = {
  id: string;
  name?: string | null;
  email?: string | null;
  owner?: WhopBusinessOwner | null;
};

function sanitize(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export async function getWhopBusiness(bizId: string): Promise<WhopBusiness | null> {
  const normalizedId = bizId?.trim();
  if (!normalizedId) {
    console.warn("[whopClient] Missing business ID");
    return null;
  }

  const apiKey = process.env.WHOP_API_KEY;
  if (!apiKey) {
    console.warn("[whopClient] WHOP_API_KEY is not configured – cannot fetch business details");
    return null;
  }

  try {
    const res = await fetch(`${WHOP_API_BASE}/v2/businesses/${encodeURIComponent(normalizedId)}`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.warn(
        `[whopClient] Failed to fetch business ${normalizedId}: ${res.status} ${res.statusText} ${text}`,
      );
      return null;
    }

    const payload = (await res.json().catch(() => null)) as WhopBusiness | null;
    if (!payload) {
      console.warn(`[whopClient] Business ${normalizedId} returned empty payload`);
      return null;
    }

    return {
      id: payload.id,
      name: sanitize(payload.name),
      email: sanitize(payload.email),
      owner: payload.owner
        ? {
            email: sanitize(payload.owner.email),
            name: sanitize(payload.owner.name),
          }
        : null,
    };
  } catch (error) {
    console.error(`[whopClient] Unexpected error fetching business ${normalizedId}`, error);
    return null;
  }
}
