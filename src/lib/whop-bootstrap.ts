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
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/whop-bootstrap`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
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
      return {
        success: false,
        error: `Bootstrap failed: ${error}`,
      };
    }
    
    const data = await response.json();
    console.log('Whop user bootstrapped successfully');
    
    // If we got a session URL, use it to sign in
    if (data.session_url) {
      console.log('Signing in with session URL...');
      try {
        // Extract the token from the magic link URL
        const url = new URL(data.session_url);
        const token = url.searchParams.get('token');
        
        if (token) {
          const { createClient } = await import('@/lib/supabase/client');
          const supabase = createClient();
          const { error: verifyError } = await supabase.auth.verifyOtp({
            token_hash: token,
            type: 'magiclink',
          });
          
          if (verifyError) {
            console.error('Failed to verify session token:', verifyError);
          } else {
            console.log('Session established successfully');
          }
        }
      } catch (e) {
        console.error('Failed to establish session:', e);
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
