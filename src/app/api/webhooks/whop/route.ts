import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

/**
 * Verify Whop webhook signature
 * @param payload - The webhook payload
 * @param signature - The x-whop-signature header value
 * @param secret - The WHOP_WEBHOOK_SECRET environment variable
 * @returns true if signature is valid, false otherwise
 */
function verifyWhopSignature(payload: any, signature: string | null, secret: string | undefined): boolean {
  if (!signature || !secret) {
    console.warn('[whop-webhook-proxy] Missing signature or secret for verification');
    return false;
  }

  try {
    // Create HMAC SHA-256 hash of the payload using the secret
    const hmac = crypto.createHmac('sha256', secret);
    const payloadString = JSON.stringify(payload);
    hmac.update(payloadString);
    const expectedSignature = hmac.digest('hex');

    // Compare signatures using timing-safe comparison
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch (error) {
    console.error('[whop-webhook-proxy] Signature verification error:', error);
    return false;
  }
}

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
    const webhookSecret = process.env.WHOP_WEBHOOK_SECRET;

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

    // SECURITY: Verify webhook signature
    if (process.env.NODE_ENV === 'production') {
      if (!webhookSecret) {
        console.error('[whop-webhook-proxy] ❌ WHOP_WEBHOOK_SECRET not configured in production');
        return NextResponse.json(
          { error: 'Webhook configuration error' },
          { status: 500 }
        );
      }

      const isValid = verifyWhopSignature(payload, whopSignature, webhookSecret);
      if (!isValid) {
        console.error('[whop-webhook-proxy] ❌ Invalid webhook signature');
        return NextResponse.json(
          { error: 'Invalid signature' },
          { status: 401 }
        );
      }

      console.log('[whop-webhook-proxy] ✅ Webhook signature verified');
    } else {
      console.log('[whop-webhook-proxy] ⚠️ Development mode - skipping signature verification');
    }

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
