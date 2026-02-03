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
  const [userId, setUserId] = useState<string | null>(null);
  const subscriptionRef = useRef<any>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    const initializeAuthState = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (mountedRef.current) {
          setUserId(session?.user?.id ?? null);
        }
      } catch {
        if (mountedRef.current) {
          setUserId(null);
        }
      }
    };

    initializeAuthState();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mountedRef.current) return;
      setUserId(session?.user?.id ?? null);
    });

    return () => {
      mountedRef.current = false;
      subscription.unsubscribe();
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
        subscriptionRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    let active = true;

    const loadCurrencyAndSubscribe = async () => {
      try {
        if (!userId || !mountedRef.current || !active) {
          setCurrency('GBP');
          setLoading(false);
          return;
        }

        setLoading(true);

        const { data, error } = await supabase
          .from('profiles')
          .select('default_currency')
          .eq('id', userId)
          .maybeSingle();

        if (!active || !mountedRef.current) return;

        if (!error && data?.default_currency) {
          setCurrency(data.default_currency);
        } else {
          setCurrency('GBP');
        }

        setLoading(false);

        const subscription = supabase
          .channel(`profile:${userId}`)
          .on('postgres_changes', {
            event: 'UPDATE',
            schema: 'public',
            table: 'profiles',
            filter: `id=eq.${userId}`,
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
      active = false;
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
        subscriptionRef.current = null;
      }
    };
  }, [userId]);

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
