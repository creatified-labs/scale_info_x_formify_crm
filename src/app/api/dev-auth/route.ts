import { NextResponse } from 'next/server';

/**
 * Local development authentication endpoint
 * This creates a test session for local development only
 * DO NOT use in production - only works when NODE_ENV is 'development'
 */
export async function GET(request: Request) {
  // Only allow in development
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 });
  }

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

    // Get the origin from the request to build the redirect URL
    const url = new URL(request.url);
    const origin = url.origin;
    const returnTo = url.searchParams.get('returnTo') || '/scheduling';
    const fullRedirectUrl = `${origin}${returnTo}`;

    // Use the actual company ID from environment
    const companyId = url.searchParams.get('companyId') || process.env.NEXT_PUBLIC_WHOP_COMPANY_ID || 'biz_5c2wnbWihQovAt';
    
    // Call wap-bootstrap to create a test session
    const response = await fetch(`${supabaseUrl}/functions/v1/wap-bootstrap`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
      },
      body: JSON.stringify({
        whop_org_id: companyId,
        email: 'dev@localhost.test',
        name: 'Local Dev User',
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('wap-bootstrap error:', error);
      return NextResponse.json({ error: 'Failed to create session', details: error }, { status: 500 });
    }

    const data = await response.json();

    if (!data.action_link) {
      return NextResponse.json({ error: 'No action link returned' }, { status: 500 });
    }

    // The action_link from wap-bootstrap should redirect back to our app
    // Redirect to the magic link to create the session
    return NextResponse.redirect(data.action_link);
  } catch (error) {
    console.error('Dev auth error:', error);
    return NextResponse.json({
      error: 'Failed to authenticate',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
