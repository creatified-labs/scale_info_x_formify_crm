import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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
    const companyId = companyIdFromQuery || (pathMatch ? pathMatch[0] : null) || 
      process.env.NEXT_PUBLIC_WHOP_COMPANY_ID;

    console.log('[whop-session] Request:', {
      hasUserToken: !!userToken,
      companyId,
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

    if (!companyId) {
      return NextResponse.json(
        { error: 'No company ID available' },
        { status: 400 }
      );
    }

    // Find or create company
    let { data: company } = await supabaseAdmin
      .from('companies')
      .select('id')
      .eq('whop_company_id', companyId)
      .single();

    if (!company) {
      // Create the company
      const { data: newCompany, error: companyError } = await supabaseAdmin
        .from('companies')
        .insert({
          id: companyId,
          name: companyId,
          whop_company_id: companyId,
        })
        .select()
        .single();

      if (companyError && !companyError.message.includes('duplicate')) {
        console.error('[whop-session] Failed to create company:', companyError);
      } else {
        company = newCompany;
      }
    }

    // Determine the email to use for the user
    const userEmail = whopEmail || `${companyId.toLowerCase()}@whop.placeholder`;

    // Find existing auth user by email
    const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers();
    let authUser = authUsers?.users?.find(u => u.email === userEmail);

    if (!authUser) {
      // Create new auth user
      const { data: newAuthUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: userEmail,
        email_confirm: true,
        user_metadata: {
          company_id: companyId,
          whop_org_id: companyId,
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

      // If user already exists, find them
      if (!authUser) {
        const existingAuthUser = authUsers?.users?.find(u => u.email === userEmail);
        if (existingAuthUser) {
          authUser = existingAuthUser;
        }
      }
    }

    if (!authUser) {
      return NextResponse.json(
        { error: 'Failed to find or create user' },
        { status: 500 }
      );
    }

    // Update user metadata with company_id if not set
    if (!authUser.user_metadata?.company_id) {
      await supabaseAdmin.auth.admin.updateUserById(authUser.id, {
        user_metadata: {
          ...authUser.user_metadata,
          company_id: companyId,
          whop_org_id: companyId,
          whop_user_id: whopUserId,
        },
      });
    }

    // Ensure user record exists in users table
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('id', authUser.id)
      .single();

    if (!existingUser) {
      await supabaseAdmin.from('users').insert({
        id: authUser.id,
        email: userEmail,
        name: whopName || 'Whop User',
        company_id: companyId,
        whop_user_id: whopUserId,
      }).then(res => {
        if (res.error && !res.error.message.includes('duplicate')) {
          console.error('[whop-session] Failed to create user record:', res.error);
        }
      });
    }

    // Generate magic link to get session tokens
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: userEmail,
    });

    if (linkError || !linkData) {
      console.error('[whop-session] Failed to generate session:', linkError);
      return NextResponse.json(
        { error: 'Failed to generate session' },
        { status: 500 }
      );
    }

    console.log('[whop-session] Session generated for user:', authUser.id);

    return NextResponse.json({
      success: true,
      action_link: linkData.properties.action_link,
      user_id: authUser.id,
      company_id: companyId,
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
