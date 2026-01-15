"use client";

import { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getCurrencySymbol } from '@/lib/currency';

interface CurrencyContextType {
  currency: string;
  symbol: string;
  loading: boolean;
  formatAmount: (amount: number) => string;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export function CurrencyProvider({ children }: { children: ReactNode }) {
  // Load from localStorage immediately for instant display, fallback to USD
  const getInitialCurrency = () => {
    if (typeof window === 'undefined') return 'USD';
    try {
      const cached = localStorage.getItem('user_currency');
      return cached || 'USD';
    } catch {
      return 'USD';
    }
  };

  const [currency, setCurrency] = useState<string>(getInitialCurrency());
  const [loading, setLoading] = useState(false); // Start as false to prevent flash

  useEffect(() => {
    let mounted = true;
    let subscription: ReturnType<typeof supabase.channel> | null = null;

    const loadCurrency = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user || !mounted) {
          console.log('[CurrencyContext] No session or not mounted');
          return;
        }

        // Load initial currency
        const { data, error } = await supabase
          .from('profiles')
          .select('default_currency')
          .eq('id', session.user.id)
          .maybeSingle();

        console.log('[CurrencyContext] Loaded currency from DB:', {
          currency: data?.default_currency,
          error,
          userId: session.user.id
        });

        if (mounted && data?.default_currency) {
          // Cache in localStorage FIRST for instant loading next time
          try {
            localStorage.setItem('user_currency', data.default_currency);
          } catch (err) {
            console.warn('[CurrencyContext] Failed to cache currency:', err);
          }
          
          // Only update state if currency actually changed to avoid unnecessary re-renders
          if (data.default_currency !== currency) {
            console.log('[CurrencyContext] Setting currency to:', data.default_currency);
            setCurrency(data.default_currency);
          }
        }

        // Set up real-time subscription for currency updates (only once)
        if (!subscription) {
          subscription = supabase
            .channel(`currency-updates:${session.user.id}`)
            .on('postgres_changes', {
              event: 'UPDATE',
              schema: 'public',
              table: 'profiles',
              filter: `id=eq.${session.user.id}`,
            }, (payload) => {
              if (mounted && payload.new && (payload.new as any).default_currency) {
                const newCurrency = (payload.new as any).default_currency;
                console.log('[CurrencyContext] Real-time update received:', newCurrency);
                setCurrency(newCurrency);
              }
            })
            .subscribe();
        }
      } catch (err) {
        console.error('[CurrencyContext] Error loading currency:', err);
      }
    };

    loadCurrency();

    // Listen for custom currency update event (triggered when user saves in settings)
    const handleCurrencyUpdate = () => {
      console.log('[CurrencyContext] Currency update event received, reloading...');
      loadCurrency();
    };

    // Listen for company switch event to reload currency for new company
    const handleCompanySwitched = () => {
      console.log('[CurrencyContext] Company switched, reloading currency...');
      loadCurrency();
    };

    window.addEventListener('currency-updated', handleCurrencyUpdate);
    window.addEventListener('company-switched', handleCompanySwitched);

    return () => {
      mounted = false;
      if (subscription) {
        supabase.removeChannel(subscription);
      }
      window.removeEventListener('currency-updated', handleCurrencyUpdate);
      window.removeEventListener('company-switched', handleCompanySwitched);
    };
  }, []); // Empty dependency array - only run once on mount

  const symbol = getCurrencySymbol(currency);

  const formatAmount = useCallback((amount: number): string => {
    return `${symbol}${amount.toLocaleString('en-GB', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  }, [symbol]);

  return (
    <CurrencyContext.Provider value={{ currency, symbol, loading, formatAmount }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrencyContext() {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    throw new Error('useCurrencyContext must be used within a CurrencyProvider');
  }
  return context;
}
