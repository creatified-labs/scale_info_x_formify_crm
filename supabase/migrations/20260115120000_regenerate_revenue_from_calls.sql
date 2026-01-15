-- Regenerate revenue entries from converted calls
-- The app uses call_logs table, not bookings table, for conversion tracking

-- First, update existing revenue entries to use event type name as category
UPDATE revenue_entries re
SET 
  description = COALESCE(et.name, 'Booking') || ': ' || COALESCE(
    SPLIT_PART(re.description, ': ', 2),
    'Unknown'
  ),
  category = LOWER(REPLACE(et.name, ' ', '_')),
  category_name = et.name,
  event_type_name = et.name
FROM bookings b
LEFT JOIN event_types et ON et.id = b.event_type_id
WHERE re.booking_id = b.id
  AND re.description LIKE 'Booking:%'
  AND et.name IS NOT NULL;

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
  event_type_id,
  event_type_name,
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
  COALESCE(et.name, 'Booking') || ': ' || COALESCE(c.client_name, 'Unknown') as description,
  LOWER(REPLACE(COALESCE(et.name, 'Booking'), ' ', '_')) as category,
  COALESCE(et.name, 'Booking') as category_name,
  c.booking_id,
  b.event_type_id,
  et.name,
  jsonb_build_object(
    'source', 'booking_conversion',
    'booking_id', c.booking_id,
    'call_id', c.id
  ) as metadata,
  c.created_at,
  c.updated_at
FROM call_logs c
LEFT JOIN bookings b ON b.id = c.booking_id
LEFT JOIN event_types et ON et.id = b.event_type_id
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
