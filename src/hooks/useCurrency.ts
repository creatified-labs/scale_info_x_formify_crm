import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getCurrencySymbol } from '@/lib/currency';

/**
 * Hook to get the user's default currency preference
 * Returns the currency code and symbol
 *
 * Currency is user-scoped - each user can set their own currency preference
 * that persists across all companies they manage
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

        // Fetch currency from user's profile
        const { data, error } = await supabase
          .from('profiles')
          .select('default_currency')
          .eq('id', user.id)
          .maybeSingle();

        if (!error && data?.default_currency) {
          setCurrency(data.default_currency);
        } else if (error) {
          console.warn('Error loading user currency, using default:', error);
        }
      } catch (error) {
        console.error('Error loading currency:', error);
      } finally {
        setLoading(false);
      }
    };

    loadCurrency();

    // Subscribe to profile changes for real-time currency updates
    const setupSubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const subscription = supabase
        .channel(`user-currency:${user.id}`)
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
    // Don't show currency symbol while loading to prevent flash from £ to $
    if (loading) {
      return amount.toLocaleString('en-GB', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
    }
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
