/**
 * Whop Authentication Middleware
 * Validates user tokens and checks access levels for protected routes
 */

import { NextRequest, NextResponse } from 'next/server';
import { whopSDK } from '@/lib/whop';

export interface WhopAuthContext {
  userId: string;
  hasAccess: boolean;
  accessLevel: 'customer' | 'admin' | 'no_access';
  companyId?: string;
}

/**
 * Verify Whop user authentication
 * Checks x-whop-user-token header and validates it
 */
export async function verifyWhopAuth(
  request: NextRequest
): Promise<WhopAuthContext | null> {
  try {
    const userToken = request.headers.get('x-whop-user-token');
    
    if (!userToken) {
      console.warn('[WhopAuth] Missing x-whop-user-token header');
      return null;
    }

    // Verify token by fetching user data
    const user = await whopSDK.getUser(userToken);
    
    if (!user || !user.id) {
      console.warn('[WhopAuth] Invalid user token');
      return null;
    }

    return {
      userId: user.id,
      hasAccess: false, // Will be set by checkResourceAccess
      accessLevel: 'no_access',
    };
  } catch (error) {
    console.error('[WhopAuth] Authentication error:', error);
    return null;
  }
}

/**
 * Check if user has access to a specific resource
 * @param userId - User ID from authentication
 * @param resourceId - Company, Product, or Experience ID
 * @param requiredLevel - Minimum required access level ('customer' or 'admin')
 */
export async function checkResourceAccess(
  userId: string,
  resourceId: string,
  requiredLevel: 'customer' | 'admin' = 'customer'
): Promise<WhopAuthContext> {
  const access = await whopSDK.checkAccess(resourceId, userId);
  
  const hasRequiredAccess = 
    access.has_access && 
    (requiredLevel === 'customer' || access.access_level === 'admin');

  return {
    userId,
    hasAccess: hasRequiredAccess,
    accessLevel: access.access_level,
    companyId: resourceId.startsWith('biz_') ? resourceId : undefined,
  };
}

/**
 * Middleware to protect Dashboard View routes
 * Requires admin access to the company
 */
export async function requireDashboardAccess(
  request: NextRequest,
  companyId: string
): Promise<NextResponse | WhopAuthContext> {
  const auth = await verifyWhopAuth(request);
  
  if (!auth) {
    return NextResponse.json(
      { error: 'Unauthorized - Invalid or missing authentication' },
      { status: 401 }
    );
  }

  const accessCheck = await checkResourceAccess(auth.userId, companyId, 'admin');
  
  if (!accessCheck.hasAccess) {
    return NextResponse.json(
      { error: 'Forbidden - Admin access required' },
      { status: 403 }
    );
  }

  return accessCheck;
}

/**
 * Middleware to protect Experience View routes
 * Requires customer or admin access
 */
export async function requireExperienceAccess(
  request: NextRequest,
  experienceId: string
): Promise<NextResponse | WhopAuthContext> {
  const auth = await verifyWhopAuth(request);
  
  if (!auth) {
    return NextResponse.json(
      { error: 'Unauthorized - Invalid or missing authentication' },
      { status: 401 }
    );
  }

  const accessCheck = await checkResourceAccess(auth.userId, experienceId, 'customer');
  
  if (!accessCheck.hasAccess) {
    return NextResponse.json(
      { error: 'Forbidden - Valid membership required' },
      { status: 403 }
    );
  }

  return accessCheck;
}
