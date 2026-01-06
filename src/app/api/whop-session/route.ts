import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * Server-side API route to establish a Supabase session from Whop authentication
 * 
 * This route:
 * 1. Reads the x-whop-user-token header (sent by Whop's iframe)
 * 2. Validates the token with Whop's API to get user info
 * 3. Finds or creates the user in Supabase
 * 4. Returns session tokens for the client to use
 */
export async function GET(request: NextRequest) {
  try {
    // Get the Whop user token from headers
    const userToken = request.headers.get('x-whop-user-token');
    
    // Get company ID from URL path or query
    const url = new URL(request.url);
    const companyIdFromQuery = url.searchParams.get('companyId');
    const pathMatch = request.nextUrl.pathname.match(/biz_[a-zA-Z0-9]+/);
    const whopOrgId = companyIdFromQuery || (pathMatch ? pathMatch[0] : null) || 
      process.env.NEXT_PUBLIC_WHOP_COMPANY_ID;

    console.log('[whop-session] Request:', {
      hasUserToken: !!userToken,
      whopOrgId,
      pathname: request.nextUrl.pathname,
    });

    // Create Supabase admin client
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    let whopUserId: string | null = null;
    let whopEmail: string | null = null;
    let whopName: string | null = null;

    // If we have a Whop user token, validate it and get user info
    if (userToken) {
      try {
        const whopResponse = await fetch('https://api.whop.com/api/v5/me/user', {
          headers: {
            'Authorization': `Bearer ${userToken}`,
            'Content-Type': 'application/json',
          },
        });

        if (whopResponse.ok) {
          const whopUser = await whopResponse.json();
          whopUserId = whopUser.id;
          whopEmail = whopUser.email;
          whopName = whopUser.name || whopUser.username;
          console.log('[whop-session] Whop user validated:', { whopUserId, whopEmail });
        } else {
          console.warn('[whop-session] Failed to validate Whop token:', whopResponse.status);
        }
      } catch (error) {
        console.error('[whop-session] Error validating Whop token:', error);
      }
    }

    if (!whopOrgId) {
      return NextResponse.json(
        { error: 'No company ID available' },
        { status: 400 }
      );
    }

    // Find or create company by Whop org id (biz_xxx) but store UUID internally
    let { data: company, error: companyLookupError } = await supabaseAdmin
      .from('companies')
      .select('id, whop_company_id')
      .eq('whop_company_id', whopOrgId)
      .maybeSingle();

    if (companyLookupError && companyLookupError.code !== 'PGRST116') {
      console.error('[whop-session] Company lookup error:', companyLookupError);
    }

    let companyUuid = company?.id || null;

    if (!companyUuid) {
      // Create the company
      const newCompanyId = randomUUID();
      const { data: newCompany, error: companyError } = await supabaseAdmin
        .from('companies')
        .insert({
          id: newCompanyId,
          name: whopName || whopOrgId,
          whop_company_id: whopOrgId,
        })
        .select('id, whop_company_id')
        .single();

      if (companyError && !companyError.message.includes('duplicate')) {
        console.error('[whop-session] Failed to create company:', companyError);
      } else {
        company = newCompany;
        companyUuid = newCompany?.id ?? null;
      }
    }

    if (!companyUuid) {
      console.error('[whop-session] Missing company UUID after create/find');
      return NextResponse.json(
        { error: 'Failed to resolve company' },
        { status: 500 }
      );
    }

    // Determine the email to use for the user
    const userEmail = whopEmail || `${whopOrgId.toLowerCase()}@whop.placeholder`;

    // Find existing auth user by email
    const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers();
    let authUser = authUsers?.users?.find(u => u.email === userEmail);

    if (!authUser) {
      // Create new auth user
      const { data: newAuthUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: userEmail,
        email_confirm: true,
        user_metadata: {
          company_id: companyUuid,
          whop_org_id: whopOrgId,
          whop_user_id: whopUserId,
          name: whopName || 'Whop User',
        },
      });

      if (createError && !createError.message.includes('already been registered')) {
        console.error('[whop-session] Failed to create auth user:', createError);
        return NextResponse.json(
          { error: 'Failed to create user' },
          { status: 500 }
        );
      }

      if (newAuthUser?.user) {
        authUser = newAuthUser.user;
      }
    }

    if (!authUser) {
      // Fetch the user directly by email/default provider
      const { data: userByEmail } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('email', userEmail)
        .maybeSingle();

      if (userByEmail?.id) {
        const { data: existingAuth } = await supabaseAdmin.auth.admin.getUserById(userByEmail.id);
        if (existingAuth?.user) {
          authUser = existingAuth.user;
        }
      }
    }

    if (!authUser) {
      return NextResponse.json(
        { error: 'Failed to find or create user' },
        { status: 500 }
      );
    }

    // Update user metadata with company_id (UUID) and Whop references if missing or outdated
    const metadataNeedsUpdate =
      authUser.user_metadata?.company_id !== companyUuid ||
      authUser.user_metadata?.whop_org_id !== whopOrgId ||
      (!authUser.user_metadata?.whop_user_id && whopUserId);

    if (metadataNeedsUpdate) {
      const { data: updatedUser, error: metadataError } = await supabaseAdmin.auth.admin.updateUserById(authUser.id, {
        user_metadata: {
          ...authUser.user_metadata,
          company_id: companyUuid,
          whop_org_id: whopOrgId,
          whop_user_id: whopUserId,
          name: whopName || authUser.user_metadata?.name || 'Whop User',
        },
      });

      if (metadataError) {
        console.error('[whop-session] Failed to update user metadata:', metadataError);
      } else if (updatedUser?.user) {
        authUser = updatedUser.user;
      }
    }

    // Ensure user record exists in users table
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('id', authUser.id)
      .maybeSingle();

    if (!existingUser) {
      await supabaseAdmin.from('users').insert({
        id: authUser.id,
        email: userEmail,
        name: whopName || 'Whop User',
        company_id: companyUuid,
        whop_user_id: whopUserId,
      }).then(res => {
        if (res.error && !res.error.message.includes('duplicate')) {
          console.error('[whop-session] Failed to create user record:', res.error);
        }
      });
    }

    // Ensure profile row exists and has the correct company association for RLS policies
    const { data: profileRow } = await supabaseAdmin
      .from('profiles')
      .select('id, company_id')
      .eq('id', authUser.id)
      .maybeSingle();

    if (!profileRow) {
      const { error: profileInsertError } = await supabaseAdmin
        .from('profiles')
        .insert({
          id: authUser.id,
          company_id: companyUuid,
        });

      if (profileInsertError && !profileInsertError.message.includes('duplicate')) {
        console.error('[whop-session] Failed to insert profile:', profileInsertError);
      }
    } else if (profileRow.company_id !== companyUuid) {
      const { error: profileUpdateError } = await supabaseAdmin
        .from('profiles')
        .update({ company_id: companyUuid })
        .eq('id', authUser.id);

      if (profileUpdateError) {
        console.error('[whop-session] Failed to update profile company_id:', profileUpdateError);
      }
    }

    // Generate magic link and use the hashed_token directly
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: userEmail,
    });

    if (linkError || !linkData) {
      console.error('[whop-session] Failed to generate link:', linkError);
      return NextResponse.json(
        { error: 'Failed to generate session' },
        { status: 500 }
      );
    }

    // Use the hashed_token directly from the response (more reliable than parsing URL)
    let tokenHash: string | undefined = linkData.properties.hashed_token;
    
    console.log('[whop-session] Generated link for:', userEmail, 'tokenHash from properties:', !!tokenHash);

    if (!tokenHash) {
      // Fallback: try to extract from URL
      const actionLink = linkData.properties.action_link;
      console.log('[whop-session] action_link:', actionLink);
      const linkUrl = new URL(actionLink);
      tokenHash = linkUrl.searchParams.get('token_hash') || linkUrl.searchParams.get('token') || undefined;
      
      if (!tokenHash) {
        console.error('[whop-session] No token found in link properties or URL');
        return NextResponse.json(
          { error: 'Failed to extract token' },
          { status: 500 }
        );
      }
      console.log('[whop-session] Using token from URL');
    }

    // Verify the OTP to get actual session tokens
    const { data: sessionData, error: verifyError } = await supabaseAdmin.auth.verifyOtp({
      token_hash: tokenHash,
      type: 'magiclink',
    });

    if (verifyError || !sessionData.session) {
      console.error('[whop-session] Failed to verify OTP:', verifyError);
      return NextResponse.json(
        { error: 'Failed to create session', details: verifyError?.message },
        { status: 500 }
      );
    }

    console.log('[whop-session] Session created for user:', authUser.id);

    return NextResponse.json({
      success: true,
      access_token: sessionData.session.access_token,
      refresh_token: sessionData.session.refresh_token,
      user_id: authUser.id,
      company_id: companyUuid,
      whop_org_id: whopOrgId,
    });

  } catch (error) {
    console.error('[whop-session] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
