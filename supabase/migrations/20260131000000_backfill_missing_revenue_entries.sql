-- Backfill missing revenue entries from converted bookings
-- This ensures all converted bookings have corresponding revenue entries

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
  event_type_name,
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
  COALESCE(et.name, 'Booking') || ': ' || COALESCE(b.invitee_name, 'Unknown') as description,
  LOWER(REPLACE(COALESCE(et.name, 'calls'), ' ', '_')) as category,
  COALESCE(et.name, 'Calls') as category_name,
  b.id as booking_id,
  b.event_type_id,
  et.name as event_type_name,
  jsonb_build_object(
    'source', 'booking_conversion',
    'booking_id', b.id,
    'event_type_id', b.event_type_id
  ) as metadata,
  COALESCE(b.converted_at, b.updated_at, b.created_at) as created_at,
  COALESCE(b.converted_at, b.updated_at, b.created_at) as updated_at
FROM bookings b
LEFT JOIN event_types et ON et.id = b.event_type_id
WHERE b.is_converted = true
  AND b.conversion_amount IS NOT NULL
  AND b.conversion_amount > 0
  AND NOT EXISTS (
    SELECT 1 FROM revenue_entries re
    WHERE re.id = 'booking-conversion-' || b.id
  )
ON CONFLICT (id) DO NOTHING;

-- Log the results
DO $$
DECLARE
  total_converted INTEGER;
  total_revenue_entries INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_converted
  FROM bookings
  WHERE is_converted = true AND conversion_amount > 0;

  SELECT COUNT(*) INTO total_revenue_entries
  FROM revenue_entries
  WHERE id LIKE 'booking-conversion-%';

  RAISE NOTICE 'Total converted bookings: %, Revenue entries: %', total_converted, total_revenue_entries;
END $$;
