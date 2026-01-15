-- Migration: Add per-company currency settings
-- This fixes the issue where currency is user-scoped instead of company-scoped

-- Add currency column to event_types table (used as proxy for company settings)
ALTER TABLE public.event_types
ADD COLUMN IF NOT EXISTS default_currency TEXT DEFAULT 'GBP';

-- Add check constraint for valid currencies
ALTER TABLE public.event_types
ADD CONSTRAINT valid_currency CHECK (
  default_currency IN ('GBP', 'USD', 'EUR', 'CAD', 'AUD', 'JPY', 'INR')
);

-- Create index for fast lookups when fetching by company_id
CREATE INDEX IF NOT EXISTS idx_event_types_company_currency
ON public.event_types(company_id, default_currency);

-- Set default currency for existing event types based on their company's profile currency
-- This ensures existing data doesn't break
DO $$
DECLARE
  v_event_type RECORD;
  v_user_currency TEXT;
BEGIN
  FOR v_event_type IN
    SELECT et.id, et.company_id, c.created_by
    FROM public.event_types et
    LEFT JOIN public.companies c ON c.id = et.company_id
    WHERE et.default_currency IS NULL
  LOOP
    -- Get the user's default currency from their profile
    SELECT p.default_currency INTO v_user_currency
    FROM public.profiles p
    WHERE p.id = v_event_type.created_by
    LIMIT 1;

    -- Update event_type with user's currency (fallback to GBP if not set)
    UPDATE public.event_types
    SET default_currency = COALESCE(v_user_currency, 'GBP')
    WHERE id = v_event_type.id;
  END LOOP;

  RAISE NOTICE 'Currency migration complete - all event types now have default_currency';
END $$;
