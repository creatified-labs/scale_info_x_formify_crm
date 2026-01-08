"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        // Show feature announcement on sign-in
        if (event === 'SIGNED_IN' && session?.user) {
          showFeatureAnnouncement();
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      console.log('[Auth] Initial session check:', { hasSession: !!session, userId: session?.user?.id });
      
      if (session) {
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
            // In production (Whop), always run bootstrap
            console.log('[Auth] Production environment – running Whop bootstrap');
            const { bootstrapWhopUser } = await import('@/lib/whop-bootstrap');
            try {
              const result = await bootstrapWhopUser();

              console.log('[Auth] bootstrapWhopUser result:', result);

              if (result.success) {
                console.log('[Auth] Whop user bootstrapped successfully');
                // Refresh session after bootstrap
                const { data: { session: newSession } } = await supabase.auth.getSession();
                console.log('[Auth] Session after bootstrap:', {
                  hasSession: !!newSession,
                  userId: newSession?.user?.id,
                  companyId: newSession?.user?.user_metadata?.company_id,
                });
                setSession(newSession);
                setUser(newSession?.user ?? null);
              } else {
                console.error('[Auth] ❌ bootstrapWhopUser failed:', result.error);
              }
            } catch (error) {
              console.error('[Auth] ❌ bootstrapWhopUser threw error:', error);
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
    <AuthContext.Provider value={{ user, session, loading, signOut }}>
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
