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
  // Default to GBP - most users use GBP, prevents flash
  const [currency, setCurrency] = useState<string>('GBP');
  const [loading, setLoading] = useState(false); // Start as false to prevent flash

  useEffect(() => {
    let mounted = true;
    let subscription: ReturnType<typeof supabase.channel> | null = null;

    const loadCurrency = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user || !mounted) {
          return;
        }

        // Load initial currency
        const { data } = await supabase
          .from('profiles')
          .select('default_currency')
          .eq('id', session.user.id)
          .maybeSingle();

        if (mounted && data?.default_currency) {
          setCurrency(data.default_currency);
        }

        // Set up real-time subscription for currency updates
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
              setCurrency(newCurrency);
            }
          })
          .subscribe();
      } catch {
        // Silent fail - use default currency
      }
    };

    loadCurrency();

    // Reload currency when page becomes visible (e.g., navigating back from settings)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        loadCurrency();
      }
    };

    // Reload currency when window regains focus
    const handleFocus = () => {
      loadCurrency();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      mounted = false;
      if (subscription) {
        supabase.removeChannel(subscription);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
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
