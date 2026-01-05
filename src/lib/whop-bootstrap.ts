import { supabase } from '@/integrations/supabase/client';
import { detectWhopContext, readWhopIdentity, type WhopIdentity } from './embed';

/**
 * Bootstrap Whop user and company data
 * This ensures user and company exist in Supabase when app loads
 */
export async function bootstrapWhopUser(): Promise<{
  success: boolean;
  userId?: string;
  companyId?: string;
  error?: string;
}> {
  try {
    // Check if in Whop context
    const isWhop = detectWhopContext();
    
    // Get Whop identity
    let whopIdentity = readWhopIdentity();
    
    // Fallback to environment variable if not detected
    if (!whopIdentity.orgId && process.env.NEXT_PUBLIC_WHOP_COMPANY_ID) {
      whopIdentity = {
        ...whopIdentity,
        orgId: process.env.NEXT_PUBLIC_WHOP_COMPANY_ID,
      };
      console.log('Using fallback Whop company ID from environment');
    }
    
    if (!whopIdentity.orgId) {
      return {
        success: false,
        error: 'No Whop organization ID available',
      };
    }
    
    console.log('Bootstrapping Whop user:', {
      orgId: whopIdentity.orgId,
      email: whopIdentity.email,
      name: whopIdentity.name,
      userId: whopIdentity.userId,
    });
    
    // Check if user already has a session
    const { data: sessionData } = await supabase.auth.getSession();
    if (sessionData?.session) {
      console.log('User already has active session');
      return {
        success: true,
        userId: sessionData.session.user.id,
      };
    }
    
    // Call Edge Function to bootstrap user and company
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    console.log('Bootstrap request:', {
      url: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/whop-bootstrap`,
      hasAnonKey: !!anonKey,
      anonKeyLength: anonKey?.length,
    });
    
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/whop-bootstrap`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': anonKey || '',
        },
        body: JSON.stringify({
          whop_org_id: whopIdentity.orgId,
          whop_email: whopIdentity.email,
          whop_name: whopIdentity.name,
          whop_username: whopIdentity.username,
          whop_user_id: whopIdentity.userId,
          whop_profile_picture: whopIdentity.profilePicture,
        }),
      }
    );
    
    if (!response.ok) {
      const error = await response.text();
      console.error('Failed to bootstrap Whop user:', error);
      
      // Fallback: Try the simpler whop-auth endpoint
      console.log('Trying fallback whop-auth endpoint...');
      try {
        const authResponse = await fetch(
          `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/whop-auth`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': anonKey || '',
            },
            body: JSON.stringify({
              whop_org_id: whopIdentity.orgId,
            }),
          }
        );

        if (!authResponse.ok) {
          const authError = await authResponse.text();
          console.error('Fallback auth also failed:', authError);
          return {
            success: false,
            error: `Bootstrap failed: ${error}`,
          };
        }

        const authData = await authResponse.json();
        console.log('Fallback auth succeeded, redirecting to action link...');
        
        // Redirect to the magic link to establish session
        if (authData.action_link) {
          window.location.href = authData.action_link;
          return {
            success: true,
            userId: authData.user_id,
            companyId: authData.company_id,
          };
        }
      } catch (fallbackError) {
        console.error('Fallback auth error:', fallbackError);
      }
      
      return {
        success: false,
        error: `Bootstrap failed: ${error}`,
      };
    }
    
    const data = await response.json();
    console.log('Whop user bootstrapped successfully:', {
      hasAccessToken: !!data.access_token,
      hasRefreshToken: !!data.refresh_token,
      userId: data.user_id,
      companyId: data.company_id,
    });
    
    // If we got tokens, establish a session
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
        
        // Verify the session was set
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          console.log('Session verified:', {
            userId: session.user.id,
            hasToken: !!session.access_token,
          });
        }
      } catch (e) {
        console.error('Failed to establish session:', e);
        return {
          success: false,
          error: `Failed to establish session: ${e instanceof Error ? e.message : 'Unknown error'}`,
        };
      }
    } else {
      console.warn('No tokens returned from bootstrap');
      return {
        success: false,
        error: 'No authentication tokens returned from bootstrap',
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
