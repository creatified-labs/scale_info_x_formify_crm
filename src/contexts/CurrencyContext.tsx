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

    const loadCurrency = async () => {
      try {
        // Use getSession which is faster than getUser
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
          return;
        }

        const { data } = await supabase
          .from('profiles')
          .select('default_currency')
          .eq('id', session.user.id)
          .maybeSingle();

        if (mounted && data?.default_currency && data.default_currency !== currency) {
          setCurrency(data.default_currency);
        }
      } catch {
        // Silent fail - use default currency
      }
    };

    loadCurrency();

    // Subscribe to profile changes for real-time currency updates
    let subscription: ReturnType<typeof supabase.channel> | null = null;
    
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user || !mounted) return;

      subscription = supabase
        .channel(`currency-context:${session.user.id}`)
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${session.user.id}`,
        }, (payload) => {
          if (mounted && payload.new && (payload.new as any).default_currency) {
            setCurrency((payload.new as any).default_currency);
          }
        })
        .subscribe();
    });

    return () => {
      mounted = false;
      if (subscription) {
        supabase.removeChannel(subscription);
      }
    };
  }, [currency]);

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
