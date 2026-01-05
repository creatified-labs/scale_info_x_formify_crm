import { NextRequest, NextResponse } from "next/server";

const WHOP_API_BASE = "https://api.whop.com/api/v5";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ companyId: string }> }
) {
  const { companyId } = await context.params;

  if (!companyId) {
    return NextResponse.json({ error: "Missing companyId" }, { status: 400 });
  }

  const apiKey = process.env.WHOP_API_KEY;
  if (!apiKey) {
    console.error("[whop-company] Missing WHOP_API_KEY env var");
    return NextResponse.json({ error: "Server not configured" }, { status: 500 });
  }

  try {
    const response = await fetch(`${WHOP_API_BASE}/companies/${companyId}`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      const text = await response.text();
      console.warn("[whop-company] Whop API error", response.status, text);
      return NextResponse.json(
        { error: "Failed to load company", status: response.status },
        { status: response.status }
      );
    }

    const data = await response.json();

    return NextResponse.json({
      companyId: data?.id ?? companyId,
      name: data?.name ?? null,
      email: data?.email ?? null,
    });
  } catch (error) {
    console.error("[whop-company] Unexpected error", error);
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
