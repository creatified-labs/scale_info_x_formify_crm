"use client";

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  revalidating: boolean;
  bootstrapStatus: string;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [revalidating, setRevalidating] = useState(false);
  const [lastCompanyId, setLastCompanyId] = useState<string | null>(null);
  const [bootstrapStatus, setBootstrapStatus] = useState<string>('');

  // Helper to extract company ID from URL (this is the Whop biz_xxx ID)
  const getUrlCompanyId = useCallback(() => {
    if (!pathname) return null;
    const match = pathname.match(/\/dashboard\/([^/]+)/);
    return match?.[1] || null;
  }, [pathname]);

  // Revalidate session when company context changes (only when explicitly switching companies)
  const revalidateSession = useCallback(async () => {
    setRevalidating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const urlCompanyId = getUrlCompanyId();

      // CRITICAL: Compare whop_org_id (biz_xxx), NOT company_id (UUID)
      const sessionWhopOrgId = session?.user?.user_metadata?.whop_org_id;

      // Only re-authenticate if URL has a company ID AND it's different from session's whop_org_id
      if (session && urlCompanyId && sessionWhopOrgId && sessionWhopOrgId !== urlCompanyId) {
        console.log('[Auth] Company switch detected - URL:', urlCompanyId, 'Session:', sessionWhopOrgId);

        // Update last company ID to prevent loops
        setLastCompanyId(urlCompanyId);

        // Clear old session
        await supabase.auth.signOut();

        // Emit event to clear stale data immediately
        window.dispatchEvent(new CustomEvent('company-switching'));

        // Bootstrap with new company
        setBootstrapStatus('Connecting to new company...');
        const { bootstrapWhopUser } = await import('@/lib/whop-bootstrap');
        const result = await bootstrapWhopUser();

        if (result.success) {
          // Get the new session and ensure it's fully loaded
          const { data: { session: newSession } } = await supabase.auth.getSession();

          if (newSession) {
            setSession(newSession);
            setUser(newSession?.user ?? null);
            setBootstrapStatus('');

            console.log('[Auth] Company switch complete - session updated');
            console.log('[Auth] New session company:', newSession.user?.user_metadata?.whop_org_id);
            console.log('[Auth] New session company UUID:', newSession.user?.user_metadata?.company_id);

            // Dispatch immediately - no need to wait
            window.dispatchEvent(new CustomEvent('company-switched'));
          } else {
            console.error('[Auth] Re-authentication succeeded but no session returned');
            setBootstrapStatus('');
          }
        } else {
          console.error('[Auth] Re-authentication failed:', result.error);
          setBootstrapStatus('');
          toast({
            title: "Company Switch Failed",
            description: result.error || "Failed to switch companies. Please refresh the page.",
            variant: "destructive",
          });
        }
      }
    } finally {
      setRevalidating(false);
    }
  }, [getUrlCompanyId]);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        // Show feature announcement on sign-in
        // if (event === 'SIGNED_IN' && session?.user) {
        //   showFeatureAnnouncement();
        // }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      console.log('[Auth] Initial session check:', { hasSession: !!session, userId: session?.user?.id });

      if (session) {
        // Check if URL company matches session company (compare Whop org IDs, not UUIDs)
        const urlCompanyId = getUrlCompanyId();
        const sessionWhopOrgId = session.user.user_metadata?.whop_org_id;

        // Set initial company ID to prevent false positives on first load
        if (urlCompanyId) {
          setLastCompanyId(urlCompanyId);
        }

        if (urlCompanyId && sessionWhopOrgId && urlCompanyId !== sessionWhopOrgId) {
          console.log('[Auth] Initial load with company mismatch, re-authenticating...');
          await revalidateSession();
          setLoading(false);
          return;
        }

        // In development (localhost), check if user metadata has company_id
        // If not, force re-authentication to pick up the latest metadata
        const isLocalhost = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
        if (isLocalhost && !session.user.user_metadata?.company_id) {
          console.log('Session missing company_id, re-authenticating...');

          // Sign out first to clear the old session
          await supabase.auth.signOut();

          // Then bootstrap with dev-auth-v2
          try {
            const response = await fetch('/api/dev-auth-v2');

            if (response.ok) {
              const data = await response.json();

              if (data.access_token && data.refresh_token) {
                const { error: setSessionError } = await supabase.auth.setSession({
                  access_token: data.access_token,
                  refresh_token: data.refresh_token,
                });

                if (setSessionError) {
                  console.error('Failed to set session:', setSessionError);
                } else {
                  console.log('Dev re-authentication successful');
                  const { data: { session: newSession } } = await supabase.auth.getSession();
                  setSession(newSession);
                  setUser(newSession?.user ?? null);
                  console.log('Session refreshed with metadata:', newSession?.user?.user_metadata);
                }
              }
            }
          } catch (error) {
            console.error('Failed to re-authenticate:', error);
          }

          setLoading(false);
        } else {
          setSession(session);
          setUser(session.user);
          setLoading(false);

          // Note: Mock data seeding removed for production readiness
          // To seed data in development, manually call seedMockData() from console
        }
      } else {
        // No session - try to bootstrap
        try {
          // In development (localhost), use dev-auth for automatic authentication
          const isLocalhost = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
          if (isLocalhost) {
            console.log('Development mode: bootstrapping with dev-auth-v2...');
            const response = await fetch('/api/dev-auth-v2');

            if (response.ok) {
              const data = await response.json();

              if (data.access_token && data.refresh_token) {
                console.log('Setting session with tokens from dev-auth-v2...');
                console.log('📥 Token from dev-auth-v2:', data.access_token.substring(0, 30) + '...');
                const { error: setSessionError } = await supabase.auth.setSession({
                  access_token: data.access_token,
                  refresh_token: data.refresh_token,
                });

                if (setSessionError) {
                  console.error('Failed to set session:', setSessionError);
                } else {
                  console.log('Dev authentication successful');
                  const { data: { session: newSession } } = await supabase.auth.getSession();
                  console.log('📤 Token after setSession:', newSession?.access_token?.substring(0, 30) + '...');
                  setSession(newSession);
                  setUser(newSession?.user ?? null);
                  console.log('Session created with metadata:', newSession?.user?.user_metadata);
                }
              }
            } else {
              console.error('Dev auth failed:', await response.text());
            }
          } else {
            // Check if this is a public page that doesn't need authentication
            const isPublicPage = typeof window !== 'undefined' && (
              window.location.pathname.startsWith('/book/') ||
              window.location.pathname.startsWith('/embed/') ||
              window.location.pathname.startsWith('/meeting-link-info') ||
              window.location.pathname === '/terms' ||
              window.location.pathname === '/privacy'
            );

            if (isPublicPage) {
              console.log('[Auth] Public page detected - skipping bootstrap');
              setLoading(false);
              return;
            }

            // In production (Whop), always run bootstrap FOR PROTECTED PAGES
            console.log('[Auth] Production environment – running Whop bootstrap');
            setBootstrapStatus('Connecting to Whop...');
            const { bootstrapWhopUser } = await import('@/lib/whop-bootstrap');
            try {
              const result = await bootstrapWhopUser();

              console.log('[Auth] bootstrapWhopUser result:', result);

              if (result.success) {
                console.log('[Auth] ✅ Whop user bootstrapped successfully');
                setBootstrapStatus('Loading your data...');

                // Refresh session after bootstrap
                const { data: { session: newSession } } = await supabase.auth.getSession();
                console.log('[Auth] Session after bootstrap:', {
                  hasSession: !!newSession,
                  userId: newSession?.user?.id,
                  companyId: newSession?.user?.user_metadata?.company_id,
                });
                setSession(newSession);
                setUser(newSession?.user ?? null);
                setBootstrapStatus('');
              } else {
                console.error('[Auth] ❌ Bootstrap failed:', result.error);
                setBootstrapStatus('');
                // Show user-friendly error message
                toast({
                  title: "Setup Failed",
                  description: result.error || "Failed to initialize app. Please contact support.",
                  variant: "destructive",
                  duration: 10000,
                });
              }
            } catch (error) {
              console.error('[Auth] ❌ Bootstrap error:', error);
              setBootstrapStatus('');
              toast({
                title: "Setup Error",
                description: "An unexpected error occurred during setup. Please contact support.",
                variant: "destructive",
                duration: 10000,
              });
            }
          }
        } catch (error) {
          console.error('Failed to bootstrap user:', error);
        }

        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // FIXED: Only revalidate when company ID in URL actually changes (not on every route change)
  useEffect(() => {
    if (loading) return;

    const urlCompanyId = getUrlCompanyId();

    // Only trigger revalidation if:
    // 1. We have a company ID in the URL
    // 2. It's different from the last company ID we processed
    if (urlCompanyId && urlCompanyId !== lastCompanyId) {
      console.log('[Auth] Company ID changed in URL:', { from: lastCompanyId, to: urlCompanyId });
      setLastCompanyId(urlCompanyId);
      void revalidateSession();
    }
  }, [pathname, loading, lastCompanyId, getUrlCompanyId, revalidateSession]);

  const showFeatureAnnouncement = () => {
    // Only show once per deployment
    const ANNOUNCEMENT_KEY = 'formify_announcement_2025_12_23';

    if (typeof window === 'undefined') return;

    const hasSeenAnnouncement = localStorage.getItem(ANNOUNCEMENT_KEY);

    if (!hasSeenAnnouncement) {
      // Wait a bit for the app to load
      setTimeout(() => {
        toast({
          title: "🎉 New Features Available!",
          description: "You can now set your timezone in Account Settings. All new installs get Pro plan automatically!",
          duration: 8000,
        });
        localStorage.setItem(ANNOUNCEMENT_KEY, 'true');
      }, 1500);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, revalidating, bootstrapStatus, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
