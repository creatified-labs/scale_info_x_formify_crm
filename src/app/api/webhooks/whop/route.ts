import { NextRequest, NextResponse } from 'next/server';

/**
 * Whop webhook proxy route
 * This proxies Whop webhooks to the Supabase Edge Function
 * 
 * Whop webhook URL should be: https://your-domain.vercel.app/api/webhooks/whop
 */
export async function POST(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('[whop-webhook-proxy] Missing Supabase configuration');
      return NextResponse.json(
        { error: 'Configuration error' },
        { status: 500 }
      );
    }

    // Get the webhook payload
    const payload = await request.json();
    
    // Get the Whop signature header
    const whopSignature = request.headers.get('x-whop-signature');

    console.log('[whop-webhook-proxy] Received webhook:', {
      type: payload.type,
      action: payload.action,
      hasSignature: !!whopSignature,
    });

    // Forward to Supabase Edge Function
    const edgeFunctionUrl = `${supabaseUrl}/functions/v1/whop-payment-webhook`;
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${supabaseAnonKey}`,
      'apikey': supabaseAnonKey,
    };

    // Forward the Whop signature if present
    if (whopSignature) {
      headers['x-whop-signature'] = whopSignature;
    }

    const response = await fetch(edgeFunctionUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    const responseData = await response.json();

    console.log('[whop-webhook-proxy] Edge function response:', {
      status: response.status,
      ok: response.ok,
      data: responseData,
    });

    // Return the Edge Function response
    return NextResponse.json(responseData, { status: response.status });
  } catch (error) {
    console.error('[whop-webhook-proxy] Error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Handle OPTIONS for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, x-whop-signature',
    },
  });
}
