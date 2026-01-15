import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getCurrencySymbol } from '@/lib/currency';
import { getCompanyId } from '@/lib/company';

/**
 * Hook to get the company's default currency
 * Returns the currency code and symbol
 *
 * Currency is now company-scoped (not user-scoped) to support multi-tenant use cases
 */
export function useCurrency() {
  const [currency, setCurrency] = useState<string>('GBP');
  const [loading, setLoading] = useState(true);
  const [companyId, setCompanyId] = useState<string | null>(null);

  useEffect(() => {
    const loadCurrency = async () => {
      try {
        // Get the current company ID
        const currentCompanyId = await getCompanyId({ allowFallback: false });
        if (!currentCompanyId) {
          setLoading(false);
          return;
        }

        setCompanyId(currentCompanyId);

        // Fetch currency from the company's primary event_type
        const { data, error } = await supabase
          .from('event_types')
          .select('default_currency')
          .eq('company_id', currentCompanyId)
          .order('created_at', { ascending: true })
          .limit(1)
          .maybeSingle();

        if (!error && data?.default_currency) {
          setCurrency(data.default_currency);
        } else if (error) {
          console.warn('Error loading company currency, using default:', error);
        }
      } catch (error) {
        console.error('Error loading currency:', error);
      } finally {
        setLoading(false);
      }
    };

    loadCurrency();

    // Subscribe to event_types changes for this company
    const setupSubscription = async () => {
      const currentCompanyId = await getCompanyId({ allowFallback: false });
      if (!currentCompanyId) return;

      const subscription = supabase
        .channel(`company-currency:${currentCompanyId}`)
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'event_types',
          filter: `company_id=eq.${currentCompanyId}`,
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
  }, []); // Re-run when company changes (handled by AuthContext company-switched event)

  // Listen for company switching events to reload currency
  useEffect(() => {
    const handleCompanySwitched = () => {
      setLoading(true);
      // Reload currency for new company
      (async () => {
        try {
          const newCompanyId = await getCompanyId({ allowFallback: false });
          if (!newCompanyId) {
            setLoading(false);
            return;
          }

          setCompanyId(newCompanyId);

          const { data, error } = await supabase
            .from('event_types')
            .select('default_currency')
            .eq('company_id', newCompanyId)
            .order('created_at', { ascending: true })
            .limit(1)
            .maybeSingle();

          if (!error && data?.default_currency) {
            setCurrency(data.default_currency);
          }
        } catch (error) {
          console.error('Error reloading currency after company switch:', error);
        } finally {
          setLoading(false);
        }
      })();
    };

    window.addEventListener('company-switched', handleCompanySwitched);
    return () => {
      window.removeEventListener('company-switched', handleCompanySwitched);
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
    companyId,
  };
}
