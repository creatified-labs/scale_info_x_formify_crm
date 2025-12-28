import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Define public routes that don't require authentication
const publicRoutes = [
  '/book',
  '/f',
  '/oauth/callback',
  '/meeting-link-info',
  '/wh-admin-login',
];

// Define protected routes that require authentication
const protectedRoutes = [
  '/',
  '/dashboard',
  '/analytics',
  '/call-tracker',
  '/calendar',
  '/events',
  '/goals',
  '/pricing',
  '/scheduling',
  '/discover',
  '/experience',
];

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes
  if (publicRoutes.some(route => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Allow static files
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // For protected routes, let the client-side auth handle it
  // This middleware just ensures routes are marked as dynamic
  if (protectedRoutes.some(route => pathname === route || pathname.startsWith(route + '/'))) {
    const response = NextResponse.next();
    response.headers.set('x-middleware-cache', 'no-cache');
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
