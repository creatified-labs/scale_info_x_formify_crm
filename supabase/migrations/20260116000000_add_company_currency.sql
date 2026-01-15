-- Migration: Add per-company currency settings
-- This fixes the issue where currency is user-scoped instead of company-scoped

-- Add currency column to event_types table (used as proxy for company settings)
ALTER TABLE public.event_types
ADD COLUMN IF NOT EXISTS default_currency TEXT DEFAULT 'GBP';

-- Add check constraint for valid currencies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'valid_currency'
  ) THEN
    ALTER TABLE public.event_types
    ADD CONSTRAINT valid_currency CHECK (
      default_currency IN ('GBP', 'USD', 'EUR', 'CAD', 'AUD', 'JPY', 'INR')
    );
  END IF;
END $$;

-- Create index for fast lookups when fetching by company_id
CREATE INDEX IF NOT EXISTS idx_event_types_company_currency
ON public.event_types(company_id, default_currency);

-- Set default currency for existing event types to GBP
-- This ensures existing data doesn't break
UPDATE public.event_types
SET default_currency = 'GBP'
WHERE default_currency IS NULL;

-- Log completion
DO $$
BEGIN
  RAISE NOTICE 'Currency migration complete - all event types now have default_currency set to GBP';
END $$;
