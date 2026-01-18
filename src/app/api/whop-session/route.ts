import { NextRequest, NextResponse } from 'next/server';
import { createClient, User } from '@supabase/supabase-js';
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

    // In production, only use env fallback if explicitly running as single-tenant
    // In development, allow fallback for local testing
    const isDevelopment = process.env.NODE_ENV === 'development';
    const envFallback = isDevelopment ? process.env.NEXT_PUBLIC_WHOP_COMPANY_ID : null;

    const whopOrgId = companyIdFromQuery || (pathMatch ? pathMatch[0] : null) || envFallback;

    console.log('[whop-session] Bootstrap request:', {
      environment: process.env.NODE_ENV,
      hasUserToken: !!userToken,
      companyIdFromQuery,
      pathMatch: pathMatch?.[0],
      usingEnvFallback: !companyIdFromQuery && !pathMatch?.[0] && !!envFallback,
      whopOrgId,
      pathname: request.nextUrl.pathname,
      host: request.headers.get('host'),
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
      console.log('[whop-session] Fetching Whop user info with token');
      try {
        const whopResponse = await fetch('https://api.whop.com/api/v5/me/user', {
          headers: {
            'Authorization': `Bearer ${userToken}`,
            'Content-Type': 'application/json',
          },
        });

        if (whopResponse.ok) {
          const whopUser = await whopResponse.json();
          console.log('[whop-session] Whop API response:', JSON.stringify(whopUser, null, 2));
          whopUserId = whopUser.id;
          whopEmail = whopUser.email;
          whopName = whopUser.name || whopUser.username;
          console.log('[whop-session] Whop user validated:', { whopUserId, whopEmail, whopName });
        } else {
          const errorText = await whopResponse.text();
          console.warn('[whop-session] Failed to validate Whop token:', whopResponse.status, errorText);
        }
      } catch (error) {
        console.error('[whop-session] Error validating Whop token:', error);
      }
    } else {
      console.warn('[whop-session] No Whop user token provided in headers');
    }

    if (!whopOrgId) {
      console.error('[whop-session] ❌ No company ID provided after checking all sources');
      console.error('[whop-session] Debug info:', {
        companyIdFromQuery,
        pathMatch: pathMatch?.[0],
        envFallback,
        isDevelopment,
      });

      const errorMessage = isDevelopment
        ? `No company ID available. Tried: query=${companyIdFromQuery}, path=${pathMatch?.[0]}, env=${envFallback}. Set NEXT_PUBLIC_WHOP_COMPANY_ID in .env.local or ensure the app URL includes the company ID (e.g., /dashboard/biz_xxx).`
        : 'No company ID available. Please ensure you are accessing this app through the Whop platform. If this issue persists after refreshing, try reinstalling the app or contact support.';

      return NextResponse.json(
        {
          error: errorMessage,
          debug: isDevelopment ? { companyIdFromQuery, pathMatch: pathMatch?.[0], envFallback } : undefined,
        },
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

      // Fetch the Whop business name using the API
      let whopBusinessName: string | null = null;
      const whopApiKey = process.env.WHOP_API_KEY;

      if (!whopApiKey) {
        console.warn('[whop-session] WHOP_API_KEY not set - cannot fetch business name, using fallback');
      }

      if (whopApiKey && whopOrgId) {
        try {
          console.log('[whop-session] Fetching Whop business name for:', whopOrgId);
          const companyResponse = await fetch(`https://api.whop.com/api/v5/companies/${whopOrgId}`, {
            headers: {
              'Authorization': `Bearer ${whopApiKey}`,
              'Content-Type': 'application/json',
            },
          });

          if (companyResponse.ok) {
            const companyData = await companyResponse.json();
            whopBusinessName = companyData.title || companyData.name || null;
            console.log('[whop-session] Whop business name:', whopBusinessName);
          } else {
            console.warn('[whop-session] Failed to fetch Whop company:', companyResponse.status);
          }
        } catch (error) {
          console.error('[whop-session] Error fetching Whop company:', error);
        }
      }

      // Use Whop business name, fall back to user name, then "Scale Info"
      const companyName = whopBusinessName || whopName || 'Scale Info';

      // Generate booking slug from business name + random suffix for uniqueness
      // e.g., "creatified" -> creatified7x3k, "My Business" -> mybusiness7x3k
      const baseSlug = companyName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '')
        .substring(0, 20);
      const randomSuffix = randomUUID().substring(0, 4).toLowerCase();
      const bookingSlug = `${baseSlug || 'scaleinfo'}${randomSuffix}`;

      console.log('[whop-session] Creating new company:', {
        id: newCompanyId,
        name: companyName,
        whop_company_id: whopOrgId,
        booking_slug_prefix: bookingSlug,
      });

      const { data: newCompany, error: companyError } = await supabaseAdmin
        .from('companies')
        .insert({
          id: newCompanyId,
          name: companyName,
          whop_company_id: whopOrgId,
          branding_display_name: companyName,
          branding_name: companyName,
          booking_slug_prefix: bookingSlug,
        })
        .select('id, whop_company_id')
        .single();

      console.log('[whop-session] Company creation result:', {
        success: !companyError,
        error: companyError,
        data: newCompany,
      });

      if (companyError) {
        console.error('[whop-session] Failed to create company:', {
          message: companyError.message,
          code: companyError.code,
          details: companyError.details,
          hint: companyError.hint,
        });

        // Check if it's a duplicate error
        if (companyError.message.includes('duplicate')) {
          // First, check if this company already exists (whop_company_id duplicate)
          console.log('[whop-session] Duplicate detected, checking if company exists');
          const { data: existingCompany } = await supabaseAdmin
            .from('companies')
            .select('id, whop_company_id')
            .eq('whop_company_id', whopOrgId)
            .maybeSingle();

          if (existingCompany) {
            company = existingCompany;
            companyUuid = existingCompany.id;
            console.log('[whop-session] Found existing company:', companyUuid);
          } else {
            // It's likely a booking_slug_prefix collision - retry with a different slug
            console.log('[whop-session] Slug collision detected, retrying with new random suffix');
            const retrySlug = `${baseSlug || 'scaleinfo'}${randomUUID().substring(0, 6).toLowerCase()}`;

            const { data: retryCompany, error: retryError } = await supabaseAdmin
              .from('companies')
              .insert({
                id: newCompanyId,
                name: companyName,
                whop_company_id: whopOrgId,
                branding_display_name: companyName,
                branding_name: companyName,
                booking_slug_prefix: retrySlug,
              })
              .select('id, whop_company_id')
              .single();

            if (retryError) {
              console.error('[whop-session] ❌ Retry also failed:', retryError.message);
            } else if (retryCompany) {
              company = retryCompany;
              companyUuid = retryCompany.id;
              console.log('[whop-session] Company created on retry with slug:', retrySlug);
            }
          }
        } else {
          // Non-duplicate error
          return NextResponse.json(
            {
              error: 'Failed to create company',
              details: companyError.message,
              code: companyError.code,
              hint: companyError.hint,
              fullError: companyError
            },
            { status: 500 }
          );
        }
      } else {
        console.log('[whop-session] Company created successfully:', newCompany);
        company = newCompany;
        companyUuid = newCompany?.id ?? null;
        console.log('[whop-session] Set companyUuid to:', companyUuid);

        // Create default event type for new company
        if (companyUuid) {
          console.log('[whop-session] Creating default event type for new company');
          const defaultEventTypeId = randomUUID();
          await supabaseAdmin
            .from('event_types')
            .insert({
              id: defaultEventTypeId,
              company_id: companyUuid,
              user_id: null, // Will be set when first user is created
              name: '30 Minute Meeting',
              slug: '30min',
              duration_minutes: 30,
              description: 'A 30 minute meeting to discuss your needs',
              is_active: true,
              buffer_time_minutes: 0,
              max_bookings_per_day: null,
              require_confirmation: false,
              allow_guests: false,
              price: null,
              currency: 'GBP',
            })
            .then(res => {
              if (res.error && !res.error.message.includes('duplicate')) {
                console.error('[whop-session] Failed to create default event type:', res.error);
              } else {
                console.log('[whop-session] Default event type created successfully');
              }
            });
        }
      }
    }

    if (!companyUuid) {
      console.error('[whop-session] ❌ Missing company UUID after create/find');
      console.error('[whop-session] Debug info:', {
        whopOrgId,
        companyData: company,
        message: 'Company creation or lookup failed - check logs above for details'
      });
      return NextResponse.json(
        {
          error: isDevelopment
            ? `Failed to resolve company for ${whopOrgId}. Check server logs for details.`
            : 'Failed to set up your company. Please try refreshing the page. If the issue persists, contact support.',
          debug: isDevelopment ? {
            whopOrgId,
            companyUuid,
            message: 'Company creation or lookup failed - check server logs'
          } : undefined,
        },
        { status: 500 }
      );
    }

    // Determine the email to use for the user
    // For fresh installs without user token, create a unique placeholder email
    const userEmail = whopEmail || `${whopOrgId.toLowerCase().replace('biz_', '')}@whop-install.placeholder`;

    console.log('[whop-session] Looking for user with email:', userEmail);

    // Try to create user first (more efficient than listing all users)
    // If user already exists, we'll handle the error and fetch them
    let authUser: User | null = null;

    console.log('[whop-session] Attempting to create auth user with email:', userEmail);
    const { data: newAuthUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: userEmail,
      email_confirm: true,
      user_metadata: {
        company_id: companyUuid,
        whop_org_id: whopOrgId,
        whop_user_id: whopUserId || null,
        name: whopName || `User ${whopOrgId}`,
      },
    });

    if (createError) {
      if (createError.message.includes('already been registered')) {
        // User exists - fetch them from users table then get auth user
        console.log('[whop-session] User already exists, fetching existing user');
        const { data: userByEmail } = await supabaseAdmin
          .from('users')
          .select('id')
          .eq('email', userEmail)
          .maybeSingle();

        if (userByEmail?.id) {
          const { data: existingAuth } = await supabaseAdmin.auth.admin.getUserById(userByEmail.id);
          if (existingAuth?.user) {
            authUser = existingAuth.user;
            console.log('[whop-session] Found existing user:', authUser.id);
          }
        }

        // If not in users table, try listing recent users (fallback)
        if (!authUser) {
          console.log('[whop-session] User not in users table, searching auth users');
          const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers({ perPage: 100 });
          authUser = authUsers?.users?.find(u => u.email === userEmail) || null;
        }
      } else {
        console.error('[whop-session] Failed to create auth user:', createError);
        return NextResponse.json(
          { error: 'Failed to create user', details: createError.message },
          { status: 500 }
        );
      }
    } else if (newAuthUser?.user) {
      authUser = newAuthUser.user;
      console.log('[whop-session] Created new user:', authUser.id);
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

    // Ensure user record exists in users table with correct email
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('id, email')
      .eq('id', authUser.id)
      .maybeSingle();

    if (!existingUser) {
      // Create new user record
      const userData = {
        id: authUser.id,
        email: userEmail,
        name: whopName || 'Whop User',
        company_id: companyUuid,
        whop_user_id: whopUserId,
      };
      console.log('[whop-session] Creating user record with data:', userData);
      
      await supabaseAdmin.from('users').insert(userData).then(res => {
        if (res.error && !res.error.message.includes('duplicate')) {
          console.error('[whop-session] Failed to create user record:', res.error);
        } else {
          console.log('[whop-session] User record created successfully');
        }
      });
      
      // Update default event type with user_id if it exists without one
      await supabaseAdmin
        .from('event_types')
        .update({ user_id: authUser.id })
        .eq('company_id', companyUuid)
        .is('user_id', null)
        .then(res => {
          if (res.error) {
            console.error('[whop-session] Failed to update event type user_id:', res.error);
          } else {
            console.log('[whop-session] Updated default event type with user_id');
          }
        });
    } else if (existingUser.email !== userEmail) {
      // Update existing user with correct email
      await supabaseAdmin.from('users')
        .update({
          email: userEmail,
          name: whopName || 'Whop User',
          company_id: companyUuid,
          whop_user_id: whopUserId,
        })
        .eq('id', authUser.id)
        .then(res => {
          if (res.error) {
            console.error('[whop-session] Failed to update user record:', res.error);
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

    // Create session directly using admin API - no email verification needed
    console.log('[whop-session] Creating instant session for user:', authUser.id);
    
    // Use signInWithPassword with a temporary password, or update user to set password
    // First, ensure user has a password set (for instant sign-in)
    const tempPassword = randomUUID(); // Generate a secure temporary password
    
    // Update user with password (this allows instant sign-in)
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(authUser.id, {
      password: tempPassword,
    });

    if (updateError) {
      console.error('[whop-session] Failed to set user password:', updateError);
    }

    // Sign in with the password to get session tokens
    const { data: signInData, error: signInError } = await supabaseAdmin.auth.signInWithPassword({
      email: userEmail,
      password: tempPassword,
    });

    if (signInError || !signInData?.session) {
      console.error('[whop-session] Failed to sign in:', signInError);
      return NextResponse.json(
        { error: 'Failed to create session', details: signInError?.message },
        { status: 500 }
      );
    }

    console.log('[whop-session] ✅ Session created successfully for user:', authUser.id);

    return NextResponse.json({
      success: true,
      access_token: signInData.session.access_token,
      refresh_token: signInData.session.refresh_token,
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
