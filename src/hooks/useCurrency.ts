import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getCurrencySymbol } from '@/lib/currency';

/**
 * Hook to get the user's default currency from their profile
 * Returns the currency code and symbol
 */
export function useCurrency() {
  const [currency, setCurrency] = useState<string>('GBP');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadCurrency = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from('profiles')
          .select('default_currency')
          .eq('id', user.id)
          .maybeSingle();

        if (!error && data?.default_currency) {
          setCurrency(data.default_currency);
        }
      } catch (error) {
        console.error('Error loading currency:', error);
      } finally {
        setLoading(false);
      }
    };

    loadCurrency();

    // Subscribe to profile changes
    const setupSubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const subscription = supabase
        .channel(`profile:${user.id}`)
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user.id}`,
        }, (payload) => {
          if (payload.new && (payload.new as any).default_currency) {
            setCurrency((payload.new as any).default_currency);
          }
        })
        .subscribe();

      return subscription;
    };

    let subscription: any;
    setupSubscription().then(sub => {
      subscription = sub;
    });

    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, []);

  const symbol = getCurrencySymbol(currency);

  const formatAmount = (amount: number): string => {
    return `${symbol}${amount.toLocaleString('en-GB', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    })}`;
  };

  return {
    currency,
    symbol,
    formatAmount,
    loading,
  };
}
