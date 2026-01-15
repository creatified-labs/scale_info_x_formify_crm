import { useCurrencyContext } from '@/contexts/CurrencyContext';

/**
 * Hook to get the user's default currency preference
 * Returns the currency code and symbol
 *
 * Currency is user-scoped - each user can set their own currency preference
 * that persists across all companies they manage
 * 
 * This hook now uses CurrencyContext for centralized state management,
 * ensuring currency is loaded once at app level and shared across all components.
 */
export function useCurrency() {
  return useCurrencyContext();
}
