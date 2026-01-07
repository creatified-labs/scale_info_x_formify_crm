import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

// Proxy to call Edge Functions with service role key (used in dev and Whop embed where JWTs aren't stable)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { functionName, payload, method = 'POST', query } = body ?? {};

    if (!functionName) {
      return NextResponse.json({ error: 'functionName is required' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !serviceKey || !anonKey) {
      console.error('Missing Supabase env vars for edge proxy');
      return NextResponse.json({ error: 'Supabase configuration missing' }, { status: 500 });
    }

    // Get user ID from session by reading Supabase cookies
    let userId: string | undefined;
    try {
      const cookieStore = await cookies();

      // Try different cookie patterns Supabase might use
      const allCookies = cookieStore.getAll();
      console.log('Available cookies:', allCookies.map(c => c.name));

      // Look for Supabase auth cookie (format: sb-{project-ref}-auth-token)
      const authCookie = allCookies.find(c =>
        c.name.startsWith('sb-') && c.name.endsWith('-auth-token')
      );

      if (authCookie?.value) {
        try {
          // Parse the auth cookie JSON - Supabase stores session data as JSON array
          const authData = JSON.parse(authCookie.value);
          console.log('Auth cookie parsed, type:', Array.isArray(authData) ? 'array' : typeof authData);

          // Access token is typically the first element in the array
          let accessToken;
          if (Array.isArray(authData) && authData.length > 0) {
            accessToken = authData[0];
          } else if (typeof authData === 'string') {
            accessToken = authData;
          } else if (authData?.access_token) {
            accessToken = authData.access_token;
          }

          if (accessToken) {
            console.log('Access token found, length:', accessToken?.length);
            const supabase = createClient(supabaseUrl, anonKey, {
              global: {
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                },
              },
            });
            const { data: { user }, error: userError } = await supabase.auth.getUser();
            if (userError) {
              console.error('Failed to get user from token:', userError);
            } else {
              userId = user?.id;
              console.log('✅ Got user ID from session:', userId);
            }
          } else {
            console.warn('No access token found in auth cookie data');
          }
        } catch (parseError) {
          console.warn('Failed to parse auth cookie:', parseError);
        }
      } else {
        console.warn('No Supabase auth cookie found');
      }
    } catch (error) {
      console.warn('Could not get user from session:', error);
    }

    // Fallback: Try getting session directly from Supabase client
    if (!userId) {
      try {
        console.log('Attempting fallback: getting session from Supabase client');
        const supabaseClient = createClient(supabaseUrl, anonKey);
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (session?.user?.id) {
          userId = session.user.id;
          console.log('✅ Got user ID from Supabase client fallback:', userId);
        } else {
          console.warn('No session found in Supabase client fallback');
        }
      } catch (fallbackError) {
        console.warn('Fallback session retrieval failed:', fallbackError);
      }
    }

    // Add user_id to payload if not already present
    const enrichedPayload = {
      ...payload,
      user_id: payload?.user_id || userId,
    };

    const baseUrl = `${supabaseUrl}/functions/v1/${functionName}`;
    const url = query ? `${baseUrl}?${new URLSearchParams(query).toString()}` : baseUrl;

    console.log('🔧 Edge Proxy calling:', { functionName, method, userId });
    if (query) {
      console.log('📋 Query params:', query);
      console.log('🔗 Full URL:', url);
    }

    console.log('📤 Sending to edge function:', { url, payload: enrichedPayload });
    
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceKey}`,
        'apikey': anonKey,
        'X-Dev-Proxy': 'true', // Signal to Edge Function this is proxied
      },
      body: method === 'GET' ? undefined : JSON.stringify(enrichedPayload),
    });

    console.log('📥 Edge function response:', { status: response.status, ok: response.ok });

    let data;
    try {
      const text = await response.text();
      console.log('📄 Response text:', text.substring(0, 200));
      data = text ? JSON.parse(text) : {};
    } catch (parseError) {
      console.error('Failed to parse response:', parseError);
      data = { error: 'Invalid response from edge function' };
    }

    if (!response.ok) {
      console.error('❌ Edge Function failed:', { status: response.status, data });
      return NextResponse.json(data || { error: 'Unknown error' }, { status: response.status });
    }

    console.log('✅ Edge function success:', data);
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Edge proxy error:', error);
    return NextResponse.json({ error: error.message || 'Proxy error' }, { status: 500 });
  }
}
