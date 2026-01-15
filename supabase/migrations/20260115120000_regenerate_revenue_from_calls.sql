-- Regenerate revenue entries from converted calls
-- The app uses call_logs table, not bookings table, for conversion tracking

-- Insert revenue entries for all converted calls that don't already have revenue entries
INSERT INTO revenue_entries (
  id,
  company_id,
  entry_date,
  amount,
  currency,
  description,
  category,
  category_name,
  booking_id,
  metadata,
  created_at,
  updated_at
)
SELECT 
  'booking-conversion-' || c.booking_id as id,
  c.company_id,
  c.call_date as entry_date,
  c.conversion_amount as amount,
  COALESCE(c.conversion_currency, 'GBP') as currency,
  'Booking: ' || COALESCE(c.client_name, 'Unknown') as description,
  'calls' as category,
  'Calls' as category_name,
  c.booking_id,
  jsonb_build_object(
    'source', 'booking_conversion',
    'booking_id', c.booking_id,
    'call_id', c.id
  ) as metadata,
  c.created_at,
  c.updated_at
FROM call_logs c
WHERE c.is_converted = true
  AND c.conversion_amount IS NOT NULL
  AND c.conversion_amount > 0
  AND c.booking_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM revenue_entries re 
    WHERE re.id = 'booking-conversion-' || c.booking_id
  )
ON CONFLICT (id) DO NOTHING;

-- Log the regeneration
DO $$
DECLARE
  inserted_count INTEGER;
BEGIN
  GET DIAGNOSTICS inserted_count = ROW_COUNT;
  RAISE NOTICE 'Regenerated % revenue entries from converted calls', inserted_count;
END $$;
