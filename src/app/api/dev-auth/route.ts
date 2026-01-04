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
    const apiMode = url.searchParams.get('api') === 'true';

    // Create admin client with service role key
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Create or get test user for local development
    const testEmail = `dev-${companyId}@localhost.test`;

    let userId: string;

    // Try to create user, if already exists, get the existing user
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
      // User might already exist, try to get it
      if (createError.message.includes('already been registered')) {
        // Search through paginated user list
        let existingUser = null;
        let page = 1;
        const perPage = 1000;

        while (!existingUser && page <= 10) { // Max 10 pages (10k users)
          const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers({
            page,
            perPage
          });

          if (listError) {
            console.error('Error listing users:', listError);
            break;
          }

          existingUser = users?.find(u => u.email === testEmail);

          if (!existingUser && users && users.length < perPage) {
            // No more pages to check
            break;
          }

          page++;
        }

        if (!existingUser) {
          console.error('User exists but could not be found in user list');

          // Fallback: Generate magic link which returns user info
          console.log('Attempting to get user ID from magic link generation');

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

          // Extract user ID from the link response (it's in the user object, not properties)
          const linkUserId = linkData.user?.id;
          console.log('Extracted user ID from magic link:', linkUserId);

          if (linkUserId) {
            // We have the user ID! Now set up company and metadata
            userId = linkUserId;

            // Find or create company
            let { data: existingCompany } = await supabaseAdmin
              .from('companies')
              .select('id')
              .eq('whop_company_id', companyId)
              .single();

            if (!existingCompany) {
              console.log('Creating company for fallback user...');
              // Generate UUID for company id (companies.id is TEXT PRIMARY KEY with no default)
              const companyUuid = crypto.randomUUID();
              const { data: newCompany, error: companyError } = await supabaseAdmin
                .from('companies')
                .insert({
                  id: companyUuid,
                  name: 'Local Dev Company',
                  whop_company_id: companyId,
                })
                .select()
                .single();

              if (!companyError) {
                existingCompany = newCompany;

                // Create profile
                if (newCompany) {
                  await supabaseAdmin
                    .from('profiles')
                    .insert({
                      id: userId,
                      company_id: newCompany.id,
                      timezone: 'America/New_York',
                    })
                    .then(res => {
                      if (res.error && !res.error.message.includes('duplicate')) {
                        console.error('Failed to create profile:', res.error);
                      } else {
                        console.log('Profile created successfully for user:', userId);
                      }
                    });
                }
              }
            }

            // Update user metadata with company_id
            if (existingCompany) {
              await supabaseAdmin.auth.admin.updateUserById(userId, {
                user_metadata: {
                  company_id: existingCompany.id,
                  name: 'Local Dev User',
                  display_name: 'Local Dev User',
                  whop_org_id: companyId,
                }
              }).then(res => {
                if (res.error) {
                  console.error('Failed to update user metadata in fallback:', res.error);
                } else {
                  console.log('Successfully updated user metadata in fallback with company_id:', existingCompany.id);
                }
              });

              // CRITICAL: Generate a NEW magic link AFTER updating metadata
              // The previous magic link contains old metadata without company_id
              console.log('Generating new magic link with updated metadata...');
              const { data: newLinkData, error: newLinkError } = await supabaseAdmin.auth.admin.generateLink({
                type: 'magiclink',
                email: testEmail,
                options: {
                  redirectTo: `${url.origin}${returnTo}`
                }
              });

              if (!newLinkError && newLinkData) {
                console.log('New magic link generated with company_id in metadata');
                if (apiMode) {
                  return NextResponse.json({
                    success: true,
                    session_url: newLinkData.properties.action_link,
                    user_id: linkUserId,
                  });
                }
                return NextResponse.redirect(newLinkData.properties.action_link);
              }
            }
          }

          // Fallback: Return original magic link if metadata update failed
          if (apiMode) {
            return NextResponse.json({
              success: true,
              session_url: linkData.properties.action_link,
              user_id: linkUserId,
            });
          }

          return NextResponse.redirect(linkData.properties.action_link);
        }

        userId = existingUser.id;
        console.log('Using existing dev user:', userId);

        // Ensure company exists for existing user
        let { data: existingCompany } = await supabaseAdmin
          .from('companies')
          .select('id')
          .eq('whop_company_id', companyId)
          .single();

        // Create company if it doesn't exist
        if (!existingCompany) {
          console.log('Creating company for existing user...');
          // Generate UUID for company id (companies.id is TEXT PRIMARY KEY with no default)
          const companyUuid = crypto.randomUUID();
          const { data: newCompany, error: companyError } = await supabaseAdmin
            .from('companies')
            .insert({
              id: companyUuid,
              name: 'Local Dev Company',
              whop_company_id: companyId,
            })
            .select()
            .single();

          if (companyError && !companyError.message.includes('duplicate')) {
            console.error('Failed to create company for existing user:', companyError);
          } else {
            existingCompany = newCompany;

            // Create profile if company was created successfully
            if (newCompany) {
              const { error: profileError } = await supabaseAdmin
                .from('profiles')
                .insert({
                  id: userId,
                  company_id: newCompany.id,
                  timezone: 'America/New_York',
                });

              if (profileError && !profileError.message.includes('duplicate')) {
                console.error('Failed to create profile for existing user:', profileError);
              } else {
                console.log('Profile created successfully for user:', userId);
              }
            }
          }
        }

        // Update user metadata with company_id
        if (existingCompany && !existingUser.user_metadata?.company_id) {
          const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
            userId,
            {
              user_metadata: {
                ...existingUser.user_metadata,
                company_id: existingCompany.id,
                whop_org_id: companyId,
              }
            }
          );

          if (updateError) {
            console.error('Failed to update existing user metadata:', updateError);
          } else {
            console.log('Updated existing user with company_id:', existingCompany.id);
          }
        }
      } else {
        console.error('Failed to create user:', createError);
        return NextResponse.json({ error: 'Failed to create user', details: createError.message }, { status: 500 });
      }
    } else {
      userId = newUser.user.id;
      console.log('Created new dev user:', userId);

      // Create company for the new user
      // Generate UUID for company id (companies.id is TEXT PRIMARY KEY with no default)
      const companyUuid = crypto.randomUUID();
      const { data: company, error: companyError } = await supabaseAdmin
        .from('companies')
        .insert({
          id: companyUuid,
          name: 'Local Dev Company',
          whop_company_id: companyId,
        })
        .select()
        .single();

      if (companyError && !companyError.message.includes('duplicate')) {
        console.error('Failed to create company:', companyError);
      } else if (company) {
        // Create profile linking user to company
        const { error: profileError } = await supabaseAdmin
          .from('profiles')
          .insert({
            id: userId,
            company_id: company.id,
            timezone: 'America/New_York',
          });

        if (profileError && !profileError.message.includes('duplicate')) {
          console.error('Failed to create profile:', profileError);
        } else {
          console.log('Profile created successfully for new user:', userId);
        }

        // Update user metadata with company_id
        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
          userId,
          {
            user_metadata: {
              company_id: company.id,
              name: 'Local Dev User',
              display_name: 'Local Dev User',
              whop_org_id: companyId,
            }
          }
        );

        if (updateError) {
          console.error('Failed to update user metadata:', updateError);
        }
      }
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

    // If API mode, return the session URL for programmatic auth
    if (apiMode) {
      return NextResponse.json({
        success: true,
        session_url: linkData.properties.action_link,
        user_id: userId,
      });
    }

    // Otherwise redirect to the magic link to create the session
    return NextResponse.redirect(linkData.properties.action_link);
  } catch (error) {
    console.error('Dev auth error:', error);
    return NextResponse.json({
      error: 'Failed to authenticate',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
