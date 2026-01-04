import { NextResponse } from 'next/server';

// Dev-only proxy to call Edge Functions with service role key
export async function POST(request: Request) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not available' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { functionName, payload, method = 'POST' } = body;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    const url = `${supabaseUrl}/functions/v1/${functionName}`;

    console.log('🔧 Edge Proxy calling:', functionName);

    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceKey}`,
        'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        'X-Dev-Proxy': 'true', // Signal to Edge Function this is a dev request
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      console.error('Edge Function failed:', data);
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Edge proxy error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
