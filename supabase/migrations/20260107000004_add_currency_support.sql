-- Add currency support to profiles and revenue entries

-- Add default currency preference to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS default_currency TEXT DEFAULT 'GBP';
COMMENT ON COLUMN profiles.default_currency IS 'User preferred currency (GBP, USD, EUR, etc.)';

-- Add currency field to revenue entries to store per-entry currency
ALTER TABLE revenue_entries ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'GBP';
COMMENT ON COLUMN revenue_entries.currency IS 'Currency code for this revenue entry (GBP, USD, EUR, etc.)';

-- Create index for faster currency filtering
CREATE INDEX IF NOT EXISTS idx_revenue_entries_currency ON revenue_entries(currency);
