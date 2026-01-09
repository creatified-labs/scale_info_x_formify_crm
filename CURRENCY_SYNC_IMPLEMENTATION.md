# Currency Sync Implementation

## Overview
Currency changes now sync in real-time across the entire app. When a user changes their currency preference in Account Settings, all components update automatically without page refresh.

---

## How It Works

### 1. Centralized Currency Hook

The `useCurrency` hook ([src/hooks/useCurrency.ts](src/hooks/useCurrency.ts)) provides:
- **Real-time syncing**: Uses Supabase realtime subscriptions
- **Automatic updates**: All components using the hook update instantly
- **Consistent formatting**: Single source of truth for currency display

```typescript
const { currency, symbol, formatAmount, loading } = useCurrency();

// currency: 'GBP' | 'USD' | 'EUR' | etc.
// symbol: '£' | '$' | '€' | etc.
// formatAmount: (amount: number) => '£1,234.56'
// loading: boolean
```

### 2. Database Setup

Currency preference is stored per user in the `profiles` table:
- **Column**: `default_currency` (TEXT)
- **Default**: 'GBP'
- **Migration**: [20260107000004_add_currency_support.sql](supabase/migrations/20260107000004_add_currency_support.sql)

### 3. Components Updated

All major components now use `useCurrency` hook:

#### ✅ [Dashboard Page](src/app/(protected)/dashboard/page.tsx#L56)
```typescript
const { symbol: currencySymbol } = useCurrency();
// All currency displays use: currencySymbol
```

#### ✅ [Analytics Page](src/app/(protected)/analytics/page.tsx#L34)
```typescript
const { formatAmount } = useCurrency();
// All currency displays use: formatAmount(amount)
```

#### ✅ [RevenueChart Component](src/components/RevenueChart.tsx#L16)
```typescript
const { symbol } = useCurrency();
// Chart tooltips and labels use: symbol
```

---

## Usage Examples

### In a Component

```typescript
import { useCurrency } from '@/hooks/useCurrency';

export function MyComponent() {
  const { symbol, formatAmount } = useCurrency();

  return (
    <div>
      <p>Total: {formatAmount(1234.56)}</p>
      {/* Output: Total: £1,234.56 */}

      <p>Symbol: {symbol}</p>
      {/* Output: Symbol: £ */}
    </div>
  );
}
```

### Supported Currencies

From [src/lib/currency.ts](src/lib/currency.ts):
- **GBP** - £ (British Pound) - Default
- **USD** - $ (US Dollar)
- **EUR** - € (Euro)
- **CAD** - CA$ (Canadian Dollar)
- **AUD** - A$ (Australian Dollar)
- **JPY** - ¥ (Japanese Yen)
- **INR** - ₹ (Indian Rupee)

---

## How Currency Changes Are Saved

### In Account Settings
[src/app/(protected)/account/page.tsx:134-160](src/app/(protected)/account/page.tsx#L134-L160)

```typescript
const handleCurrencySave = async () => {
  const { error } = await supabase
    .from('profiles')
    .update({ default_currency: selectedCurrency })
    .eq('id', user.id);

  // Hook automatically detects this change via Supabase subscription
};
```

---

## Real-Time Sync Flow

1. **User changes currency** in Account Settings
2. **Database updates** `profiles.default_currency`
3. **Supabase broadcasts** the change to all active subscriptions
4. **useCurrency hook receives** the update ([useCurrency.ts:41-60](src/hooks/useCurrency.ts#L41-L60))
5. **All components re-render** with new currency symbol/formatter
6. **No page refresh needed** - instant sync across tabs

### Subscription Code
```typescript
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
```

---

## Testing Currency Sync

### Manual Test Steps

1. **Open Dashboard** in browser
2. **Note current currency** symbols (should all match)
3. **Open Account Settings** in new tab
4. **Change currency** from GBP to USD
5. **Return to Dashboard** tab
6. **Verify all symbols updated** to $ without refresh

### Expected Behavior
- ✅ Currency symbols update instantly across all tabs
- ✅ Revenue amounts re-format with new symbol
- ✅ Charts update with new currency
- ✅ No console errors
- ✅ No page refresh required

---

## Where Currency Is Displayed

### Dashboard Tab
- Total Revenue card
- This Month card
- This Week card
- Sales Made card
- Revenue chart tooltips
- Call performance metrics

### Analytics Tab
- Total Revenue
- Converted Revenue
- Weekly Growth comparisons
- Monthly Growth comparisons
- Average per conversion
- All chart tooltips
- Category performance

### Other Locations
- Revenue entry forms
- Revenue history list
- Goal progress indicators
- Booking conversion amounts

---

## Performance Considerations

### Optimizations
1. **Single subscription** per user session
2. **Memoized formatters** - computed once per currency change
3. **Local state** - currency stored in useState for fast access
4. **Cleanup** - subscription unsubscribes on unmount

### Network Usage
- **Initial load**: 1 database query
- **On change**: Real-time message via WebSocket (very light)
- **No polling**: Pure push-based updates

---

## Troubleshooting

### Currency Not Syncing?

**Check 1: Hook Usage**
```typescript
// ✅ Correct
const { symbol } = useCurrency();

// ❌ Wrong - manual loading breaks sync
const [currency, setCurrency] = useState('GBP');
useEffect(() => { /* manual load */ }, []);
```

**Check 2: Database Column**
```sql
-- Verify column exists
SELECT column_name FROM information_schema.columns
WHERE table_name = 'profiles' AND column_name = 'default_currency';
```

**Check 3: Subscription**
```typescript
// In browser console, should show active channel
console.log(supabase.getChannels());
```

**Check 4: RLS Policies**
```sql
-- User should be able to read their own profile
SELECT * FROM profiles WHERE id = auth.uid();
```

### Currency Shows as 'GBP' but I selected 'USD'?

1. **Check browser cache** - Hard refresh (Cmd+Shift+R)
2. **Check database** - Verify update was saved
3. **Check subscriptions** - Look for errors in console
4. **Re-authenticate** - Sign out and back in

---

## Migration Guide

### Before (Manual Loading - Don't Do This!)
```typescript
❌ const [currency, setCurrency] = useState('GBP');
❌ useEffect(() => {
❌   const loadCurrency = async () => {
❌     const { data } = await supabase
❌       .from('profiles')
❌       .select('default_currency')
❌       .eq('id', user.id)
❌       .maybeSingle();
❌     if (data) setCurrency(data.default_currency);
❌   };
❌   loadCurrency();
❌ }, []);
❌ const symbol = getCurrencySymbol(currency);
```

### After (Use Hook - Do This!)
```typescript
✅ import { useCurrency } from '@/hooks/useCurrency';
✅ const { symbol, formatAmount } = useCurrency();
✅ // That's it! Auto-syncs across all components
```

---

## Benefits

### For Users
- ✅ **Instant updates** - See changes immediately
- ✅ **Cross-tab sync** - Works across multiple browser tabs
- ✅ **No refresh needed** - Seamless experience
- ✅ **Consistent display** - All amounts match

### For Developers
- ✅ **Single source of truth** - No duplicate currency logic
- ✅ **Type-safe** - Full TypeScript support
- ✅ **Easy to use** - One import, one line of code
- ✅ **Automatic cleanup** - No memory leaks

---

## Future Enhancements

Potential improvements:
- [ ] Per-revenue-entry currency (multi-currency support)
- [ ] Currency conversion rates
- [ ] Historical currency preferences
- [ ] Company-level default currency
- [ ] Custom currency symbols

---

## Related Files

### Core Implementation
- [src/hooks/useCurrency.ts](src/hooks/useCurrency.ts) - Main hook
- [src/lib/currency.ts](src/lib/currency.ts) - Currency constants & utilities
- [supabase/migrations/20260107000004_add_currency_support.sql](supabase/migrations/20260107000004_add_currency_support.sql) - Database setup

### Usage Examples
- [src/app/(protected)/dashboard/page.tsx](src/app/(protected)/dashboard/page.tsx) - Dashboard implementation
- [src/app/(protected)/analytics/page.tsx](src/app/(protected)/analytics/page.tsx) - Analytics implementation
- [src/components/RevenueChart.tsx](src/components/RevenueChart.tsx) - Chart component

### Settings
- [src/app/(protected)/account/page.tsx](src/app/(protected)/account/page.tsx) - Currency selection UI

---

**Last Updated**: 2026-01-09
**Status**: ✅ Fully implemented and tested
