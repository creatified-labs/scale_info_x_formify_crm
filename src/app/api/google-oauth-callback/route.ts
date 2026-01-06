import { NextRequest, NextResponse } from 'next/server';

// This route handles the OAuth callback from Google and forwards to the Edge Function
// This avoids JWT verification issues with direct Edge Function callbacks
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  console.log('Google OAuth callback received', { hasCode: !!code, hasState: !!state, error });

  // If there's an error from Google, redirect to callback page with error
  if (error) {
    return NextResponse.redirect(
      new URL(`/oauth/callback?error=${error}`, request.url)
    );
  }

  // If no code, redirect with missing_code error
  if (!code) {
    return NextResponse.redirect(
      new URL('/oauth/callback?error=missing_code', request.url)
    );
  }

  // Redirect to the Next.js callback page with the code
  // The callback page will then call the Edge Function via POST through edge-proxy
  const callbackUrl = new URL('/oauth/callback', request.url);
  callbackUrl.searchParams.set('code', code);
  if (state) {
    callbackUrl.searchParams.set('state', state);
  }

  return NextResponse.redirect(callbackUrl);
}
