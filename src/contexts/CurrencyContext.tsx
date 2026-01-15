"use client";

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
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
  const [currency, setCurrency] = useState<string>('GBP');
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    let mounted = true;

    const loadCurrency = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          if (mounted) {
            setLoading(false);
            setInitialized(true);
          }
          return;
        }

        const { data, error } = await supabase
          .from('profiles')
          .select('default_currency')
          .eq('id', user.id)
          .maybeSingle();

        if (mounted) {
          if (!error && data?.default_currency) {
            setCurrency(data.default_currency);
          }
          setLoading(false);
          setInitialized(true);
        }
      } catch (error) {
        console.error('Error loading currency:', error);
        if (mounted) {
          setLoading(false);
          setInitialized(true);
        }
      }
    };

    loadCurrency();

    // Subscribe to profile changes for real-time currency updates
    let subscription: any;
    const setupSubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !mounted) return;

      subscription = supabase
        .channel(`currency-context:${user.id}`)
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user.id}`,
        }, (payload) => {
          if (mounted && payload.new && (payload.new as any).default_currency) {
            setCurrency((payload.new as any).default_currency);
          }
        })
        .subscribe();
    };

    setupSubscription();

    return () => {
      mounted = false;
      if (subscription) {
        supabase.removeChannel(subscription);
      }
    };
  }, []);

  const symbol = getCurrencySymbol(currency);

  const formatAmount = useCallback((amount: number): string => {
    if (loading) {
      return amount.toLocaleString('en-GB', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
    }
    return `${getCurrencySymbol(currency)}${amount.toLocaleString('en-GB', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  }, [currency, loading]);

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
