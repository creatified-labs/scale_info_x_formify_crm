import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const DEV_PASSWORD = 'dev-local-password-12345';

export async function GET(request: Request) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not available' }, { status: 403 });
  }

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    const url = new URL(request.url);
    const companyId = url.searchParams.get('companyId') || process.env.NEXT_PUBLIC_WHOP_COMPANY_ID || 'biz_default';

    // Use a fixed email for consistent dev user across sessions
    const testEmail = `dev-supabase-${companyId}@localhost.test`;

    // Admin client
    const admin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Regular client for sign in
    const client = createClient(supabaseUrl, anonKey);

    console.log('Dev auth: Looking for user:', testEmail);

    // Try to create user first - if it exists, we'll get an error
    let userId: string;
    const { data: newUser, error: createError } = await admin.auth.admin.createUser({
      email: testEmail,
      password: DEV_PASSWORD,
      email_confirm: true,
      user_metadata: {
        name: 'Local Dev User',
        display_name: 'Local Dev User',
        whop_org_id: companyId,
      }
    });

    if (newUser?.user) {
      // User was created successfully
      console.log('Created new user:', newUser.user.id);
      userId = newUser.user.id;
    } else if (createError && createError.message.includes('already been registered')) {
      // User exists - we need to get their ID and update password
      console.log('User exists, extracting ID via magic link...');

      // Generate magic link to extract user ID (workaround for lack of getUserByEmail)
      const { data: linkData } = await admin.auth.admin.generateLink({
        type: 'magiclink',
        email: testEmail,
      });

      if (!linkData?.user?.id) {
        console.error('Could not extract user ID');
        return NextResponse.json({ error: 'Could not find user ID' }, { status: 500 });
      }

      userId = linkData.user.id;
      console.log('Extracted user ID:', userId);

      // Update password for existing user
      await admin.auth.admin.updateUserById(userId, {
        password: DEV_PASSWORD,
        user_metadata: {
          name: 'Local Dev User',
          display_name: 'Local Dev User',
          whop_org_id: companyId,
        }
      });
      console.log('Updated password for existing user');
    } else {
      console.error('Failed to create user:', createError);
      return NextResponse.json({ error: createError?.message || 'Unknown error' }, { status: 500 });
    }

    // Find or create company
    let { data: company } = await admin
      .from('companies')
      .select('id')
      .eq('whop_company_id', companyId)
      .single();

    let isNewCompany = false;

    if (!company) {
      console.log('Creating company...');
      const companyUuid = crypto.randomUUID();
      const { data: newCompany, error: companyError } = await admin
        .from('companies')
        .insert({
          id: companyUuid,
          name: 'Local Dev Company',
          whop_company_id: companyId,
        })
        .select()
        .single();

      if (companyError || !newCompany) {
        console.error('Failed to create company:', companyError);
        return NextResponse.json({ error: companyError?.message || 'Failed to create company' }, { status: 500 });
      }

      company = newCompany;
      isNewCompany = true;
    }

    // Ensure company exists
    if (!company) {
      return NextResponse.json({ error: 'Failed to find or create company' }, { status: 500 });
    }

    // Create profile for new company
    if (isNewCompany) {
      await admin.from('profiles').insert({
        id: userId,
        company_id: company.id,
        timezone: 'America/New_York',
      });
    }

    // Update user metadata with company_id
    await admin.auth.admin.updateUserById(userId, {
      user_metadata: {
        company_id: company.id,
        name: 'Local Dev User',
        display_name: 'Local Dev User',
        whop_org_id: companyId,
      }
    });

    // Sign in with password to get VALID JWT
    console.log('Signing in with password...');
    const { data: signInData, error: signInError } = await client.auth.signInWithPassword({
      email: testEmail,
      password: DEV_PASSWORD,
    });

    if (signInError || !signInData.session) {
      console.error('Sign in failed:', signInError);
      return NextResponse.json({ error: signInError?.message || 'Sign in failed' }, { status: 500 });
    }

    console.log('✅ Dev auth successful! User:', userId, 'Company:', company.id);

    return NextResponse.json({
      success: true,
      access_token: signInData.session.access_token,
      refresh_token: signInData.session.refresh_token,
      user_id: userId,
      company_id: company.id,
    });

  } catch (error: any) {
    console.error('Dev auth error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
