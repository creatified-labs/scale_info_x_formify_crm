import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getCurrencySymbol } from '@/lib/currency';

/**
 * Hook to get the user's default currency from their profile
 * Returns the currency code and symbol
 */
export function useCurrency() {
  const [currency, setCurrency] = useState<string>('GBP');
  const [loading, setLoading] = useState(true);
  const subscriptionRef = useRef<any>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    const loadCurrencyAndSubscribe = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || !mountedRef.current) {
          if (mountedRef.current) setLoading(false);
          return;
        }

        // Load initial currency
        const { data, error } = await supabase
          .from('profiles')
          .select('default_currency')
          .eq('id', user.id)
          .maybeSingle();

        if (!error && data?.default_currency && mountedRef.current) {
          setCurrency(data.default_currency);
        }

        if (mountedRef.current) {
          setLoading(false);
        }

        // Set up subscription only if still mounted
        if (!mountedRef.current) return;

        const subscription = supabase
          .channel(`profile:${user.id}`)
          .on('postgres_changes', {
            event: 'UPDATE',
            schema: 'public',
            table: 'profiles',
            filter: `id=eq.${user.id}`,
          }, (payload) => {
            if (mountedRef.current && payload.new && (payload.new as any).default_currency) {
              setCurrency((payload.new as any).default_currency);
            }
          })
          .subscribe();

        subscriptionRef.current = subscription;
      } catch (error) {
        console.error('Error loading currency:', error);
        if (mountedRef.current) {
          setLoading(false);
        }
      }
    };

    loadCurrencyAndSubscribe();

    return () => {
      mountedRef.current = false;
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
        subscriptionRef.current = null;
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
