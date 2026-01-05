import { supabase } from '@/integrations/supabase/client';
import { detectWhopContext, readWhopIdentity } from './embed';

/**
 * Bootstrap Whop user and company data
 * This ensures user and company exist in Supabase when app loads
 * 
 * The new flow uses a server-side API route that can access the x-whop-user-token header
 * sent by Whop's iframe, which provides proper user authentication.
 */
export async function bootstrapWhopUser(): Promise<{
  success: boolean;
  userId?: string;
  companyId?: string;
  error?: string;
}> {
  try {
    // Check if user already has a session
    const { data: sessionData } = await supabase.auth.getSession();
    if (sessionData?.session) {
      console.log('User already has active session');
      return {
        success: true,
        userId: sessionData.session.user.id,
        companyId: sessionData.session.user.user_metadata?.company_id,
      };
    }

    // Get Whop identity from URL/window for company ID
    const whopIdentity = readWhopIdentity();
    const companyId = whopIdentity.orgId || process.env.NEXT_PUBLIC_WHOP_COMPANY_ID;
    
    console.log('Bootstrapping Whop user:', {
      companyId,
      isWhopContext: detectWhopContext(),
    });

    if (!companyId) {
      return {
        success: false,
        error: 'No company ID available',
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
      try {
        const { error: setSessionError } = await supabase.auth.setSession({
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
        
        console.log('Session established successfully');
      } catch (e) {
        console.error('Failed to establish session:', e);
        return {
          success: false,
          error: `Failed to establish session: ${e instanceof Error ? e.message : 'Unknown error'}`,
        };
      }
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
