import { NextResponse } from 'next/server';

/**
 * Local development authentication endpoint
 * This creates a test session for local development only
 * DO NOT use in production - only works when NODE_ENV is 'development'
 */
export async function GET(request: Request) {
  // Only allow in development
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 });
  }

  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    // Get the origin from the request to build the redirect URL
    const url = new URL(request.url);
    const returnTo = url.searchParams.get('returnTo') || '/scheduling';
    const companyId = url.searchParams.get('companyId') || process.env.NEXT_PUBLIC_WHOP_COMPANY_ID || 'biz_5c2wnbWihQovAt';

    // Create admin client with service role key
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Create or get test user for local development
    const testEmail = `dev-${companyId}@localhost.test`;
    
    // Try to get existing user or create new one
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    let userId = existingUsers?.users?.find(u => u.email === testEmail)?.id;

    if (!userId) {
      // Create new user
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: testEmail,
        email_confirm: true,
        user_metadata: {
          name: 'Local Dev User',
          display_name: 'Local Dev User',
          whop_org_id: companyId,
        }
      });

      if (createError) {
        console.error('Failed to create user:', createError);
        return NextResponse.json({ error: 'Failed to create user', details: createError.message }, { status: 500 });
      }

      userId = newUser.user.id;
    }

    // Generate a magic link for the user
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: testEmail,
      options: {
        redirectTo: `${url.origin}${returnTo}`
      }
    });

    if (linkError || !linkData) {
      console.error('Failed to generate magic link:', linkError);
      return NextResponse.json({ error: 'Failed to generate auth link', details: linkError?.message }, { status: 500 });
    }

    // Redirect to the magic link to create the session
    return NextResponse.redirect(linkData.properties.action_link);
  } catch (error) {
    console.error('Dev auth error:', error);
    return NextResponse.json({
      error: 'Failed to authenticate',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
