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
 * Internal function that performs the actual bootstrap logic
 */
async function performBootstrap(): Promise<{
  success: boolean;
  userId?: string;
  companyId?: string;
  error?: string;
}> {
  try {
    // Get Whop identity from URL/window for company ID first
    const whopIdentity = readWhopIdentity();
    // Fallback to env variable if Whop context isn't detected (for direct access)
    const companyId = whopIdentity.orgId || process.env.NEXT_PUBLIC_WHOP_COMPANY_ID;

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
      console.log('[bootstrapWhopUser] Company mismatch detected. Current:', currentWhopOrgId, 'Requested:', companyId);
      console.log('[bootstrapWhopUser] Clearing session and re-authenticating for new company...');
      await supabase.auth.signOut();
    }
    
    console.log('[bootstrapWhopUser] Bootstrapping Whop user:', {
      companyId,
      whopIdentity,
      isWhopContext: detectWhopContext(),
      envFallback: process.env.NEXT_PUBLIC_WHOP_COMPANY_ID,
      usingFallback: !whopIdentity.orgId && !!process.env.NEXT_PUBLIC_WHOP_COMPANY_ID,
    });

    if (!companyId) {
      console.error('[bootstrapWhopUser] ❌ No company ID found in Whop context or environment.');
      return {
        success: false,
        error: 'No company ID available - app must be accessed through Whop or have NEXT_PUBLIC_WHOP_COMPANY_ID set',
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
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
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
