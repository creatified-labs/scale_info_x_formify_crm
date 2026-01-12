import { supabase } from '@/integrations/supabase/client';
import { detectWhopContext, readWhopIdentity } from './embed';

// Request deduplication: track ongoing bootstrap requests
let bootstrapPromise: Promise<{
  success: boolean;
  userId?: string;
  companyId?: string;
  error?: string;
}> | null = null;

/**
 * Bootstrap Whop user and company data
 * This ensures user and company exist in Supabase when app loads
 *
 * The new flow uses a server-side API route that can access the x-whop-user-token header
 * sent by Whop's iframe, which provides proper user authentication.
 *
 * This function deduplicates concurrent requests - if a bootstrap is already in progress,
 * subsequent calls will wait for and return the same result.
 */
export async function bootstrapWhopUser(): Promise<{
  success: boolean;
  userId?: string;
  companyId?: string;
  error?: string;
}> {
  // Deduplicate concurrent requests
  if (bootstrapPromise) {
    console.log('[bootstrapWhopUser] Bootstrap already in progress, waiting for existing request...');
    return bootstrapPromise;
  }

  // Start new bootstrap
  bootstrapPromise = performBootstrap();

  try {
    return await bootstrapPromise;
  } finally {
    // Clear the promise after completion (success or failure)
    bootstrapPromise = null;
  }
}

/**
 * Validate production environment configuration
 * Throws error if NEXT_PUBLIC_WHOP_COMPANY_ID is set in production
 */
function validateProductionConfig() {
  if (typeof window === 'undefined') return; // Server-side, skip check

  const isProduction = process.env.NODE_ENV === 'production';
  const hasCompanyIdSet = !!process.env.NEXT_PUBLIC_WHOP_COMPANY_ID;

  if (isProduction && hasCompanyIdSet) {
    const errorMsg = `
🔴 CRITICAL SECURITY ERROR 🔴

NEXT_PUBLIC_WHOP_COMPANY_ID is set in production environment!

This will break multi-company support and cause all users to share the same company data.

ACTION REQUIRED:
1. Go to Vercel dashboard → Project Settings → Environment Variables
2. Delete or empty the NEXT_PUBLIC_WHOP_COMPANY_ID variable for Production
3. Redeploy the application

This variable should ONLY be set in local development (.env.local).
    `.trim();

    console.error(errorMsg);
    throw new Error('NEXT_PUBLIC_WHOP_COMPANY_ID must NOT be set in production');
  }
}

/**
 * Wait for Whop context to be available (iframe variables may take time to inject)
 * Returns company ID once detected, or null after timeout
 * Timeout: 30 attempts × 500ms = 15 seconds (increased from 5s to handle slower connections)
 */
async function waitForWhopContext(maxAttempts = 30, delayMs = 500): Promise<string | null> {
  // Validate production configuration before proceeding
  validateProductionConfig();

  for (let i = 0; i < maxAttempts; i++) {
    const whopIdentity = readWhopIdentity();
    const companyId = whopIdentity.orgId || process.env.NEXT_PUBLIC_WHOP_COMPANY_ID;

    if (companyId) {
      console.log(`[waitForWhopContext] ✅ Company ID found on attempt ${i + 1}:`, companyId);
      return companyId;
    }

    if (i < maxAttempts - 1) {
      console.log(`[waitForWhopContext] ⏳ Attempt ${i + 1}/${maxAttempts} - waiting for Whop context...`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  console.warn('[waitForWhopContext] ❌ Timed out waiting for Whop context');
  return null;
}

/**
 * Internal function that performs the actual bootstrap logic
 */
async function performBootstrap(): Promise<{
  success: boolean;
  userId?: string;
  companyId?: string;
  error?: string;
}> {
  try {
    // Wait for Whop context to be available (gives iframe time to inject variables)
    console.log('[bootstrapWhopUser] Waiting for Whop context...');
    const companyId = await waitForWhopContext();

    // Check if user already has a session
    const { data: sessionData } = await supabase.auth.getSession();
    if (sessionData?.session) {
      const currentWhopOrgId = sessionData.session.user.user_metadata?.whop_org_id;
      
      // If the session's company matches the URL's company, we're good
      if (currentWhopOrgId === companyId) {
        console.log('[bootstrapWhopUser] User already has active session for this company:', companyId);
        return {
          success: true,
          userId: sessionData.session.user.id,
          companyId: sessionData.session.user.user_metadata?.company_id,
        };
      }
      
      // Company mismatch - need to re-authenticate for the new company
      console.log('[bootstrapWhopUser] Company mismatch detected');
      console.log('[bootstrapWhopUser]   Current session company:', currentWhopOrgId);
      console.log('[bootstrapWhopUser]   Requested URL company:', companyId);
      console.log('[bootstrapWhopUser]   Clearing session and re-authenticating...');
      await supabase.auth.signOut();
    }
    
    console.log('[bootstrapWhopUser] Bootstrapping Whop user:', {
      companyId,
      isWhopContext: detectWhopContext(),
      envFallback: process.env.NEXT_PUBLIC_WHOP_COMPANY_ID,
      usingFallback: !companyId || companyId === process.env.NEXT_PUBLIC_WHOP_COMPANY_ID,
    });

    if (!companyId) {
      console.error('[bootstrapWhopUser] ❌ No company ID found after waiting for Whop context.');
      return {
        success: false,
        error: 'Failed to detect company context. Please ensure you are accessing this app through Whop, or try refreshing the page. If the issue persists, contact support.',
      };
    }
    
    // Call server-side API route which has access to x-whop-user-token header
    // This route is proxied through Next.js and receives Whop headers
    console.log('Calling server-side whop-session API...');
    
    const response = await fetch(`/api/whop-session?companyId=${companyId}`, {
      method: 'GET',
      credentials: 'include',
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Server-side auth failed:', errorText);
      return {
        success: false,
        error: `Authentication failed: ${errorText}`,
      };
    }

    const data = await response.json();
    console.log('Whop session response:', {
      success: data.success,
      hasAccessToken: !!data.access_token,
      hasRefreshToken: !!data.refresh_token,
      userId: data.user_id,
      companyId: data.company_id,
    });
    
    // Establish session with tokens
    if (data.access_token && data.refresh_token) {
      console.log('Setting session with tokens from bootstrap...');
      console.log('Access token (first 30 chars):', data.access_token.substring(0, 30));
      try {
        const { data: sessionData, error: setSessionError } = await supabase.auth.setSession({
          access_token: data.access_token,
          refresh_token: data.refresh_token,
        });
        
        if (setSessionError) {
          console.error('Failed to set session:', setSessionError);
          return {
            success: false,
            error: `Failed to set session: ${setSessionError.message}`,
          };
        }
        
        console.log('Session established successfully:', {
          hasSession: !!sessionData.session,
          hasUser: !!sessionData.user,
          userId: sessionData.user?.id,
        });

        // Verify session was actually stored
        const { data: { session: verifySession } } = await supabase.auth.getSession();
        console.log('Verified session after setSession:', {
          hasSession: !!verifySession,
          userId: verifySession?.user?.id,
          companyId: verifySession?.user?.user_metadata?.company_id,
        });

        if (!verifySession) {
          console.error('Session was not stored properly!');
          return {
            success: false,
            error: 'Session was not stored properly',
          };
        }

        // Refresh the session so we pick up the latest user metadata (company_id, etc.)
        const { error: refreshError } = await supabase.auth.refreshSession();
        if (refreshError) {
          console.warn('Failed to refresh session:', refreshError);
        } else {
          console.log('Session refreshed successfully');
        }
        
        const { data: userData } = await supabase.auth.getUser();
        console.log('User metadata after bootstrap:', {
          userId: userData.user?.id,
          companyId: userData.user?.user_metadata?.company_id,
        });
      } catch (e) {
        console.error('Failed to establish session:', e);
        return {
          success: false,
          error: `Failed to establish session: ${e instanceof Error ? e.message : 'Unknown error'}`,
        };
      }
    } else {
      console.error('No tokens received from whop-session API');
      return {
        success: false,
        error: 'No tokens received from server',
      };
    }

    console.log('[bootstrapWhopUser] ✅ Bootstrap complete:', {
      userId: data.user_id,
      companyId: data.company_id,
      whopOrgId: companyId,
    });

    return {
      success: true,
      userId: data.user_id,
      companyId: data.company_id,
    };
  } catch (error) {
    console.error('Bootstrap error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
