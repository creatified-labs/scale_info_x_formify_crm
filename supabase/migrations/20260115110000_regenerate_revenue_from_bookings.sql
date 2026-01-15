-- Regenerate revenue entries from converted bookings
-- This migration recreates revenue entries that were accidentally deleted by the cleanup migration

-- Insert revenue entries for all converted bookings that don't already have revenue entries
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
  event_type_id,
  metadata,
  created_at,
  updated_at
)
SELECT 
  'booking-conversion-' || b.id as id,
  b.company_id,
  COALESCE(DATE(b.start_time), CURRENT_DATE) as entry_date,
  b.conversion_amount as amount,
  COALESCE(b.conversion_currency, 'GBP') as currency,
  'Booking: ' || COALESCE(b.invitee_name, 'Unknown') as description,
  'calls' as category,
  'Calls' as category_name,
  b.id as booking_id,
  b.event_type_id,
  jsonb_build_object(
    'source', 'booking_conversion',
    'booking_id', b.id,
    'event_type_id', b.event_type_id
  ) as metadata,
  COALESCE(b.converted_at, b.updated_at, b.created_at) as created_at,
  COALESCE(b.converted_at, b.updated_at, b.created_at) as updated_at
FROM bookings b
WHERE b.is_converted = true
  AND b.conversion_amount IS NOT NULL
  AND b.conversion_amount > 0
  AND NOT EXISTS (
    SELECT 1 FROM revenue_entries re 
    WHERE re.id = 'booking-conversion-' || b.id
  )
ON CONFLICT (id) DO NOTHING;

-- Log the regeneration
DO $$
DECLARE
  inserted_count INTEGER;
BEGIN
  GET DIAGNOSTICS inserted_count = ROW_COUNT;
  RAISE NOTICE 'Regenerated % revenue entries from converted bookings', inserted_count;
END $$;
