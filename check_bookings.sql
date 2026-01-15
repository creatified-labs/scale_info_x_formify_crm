-- Query to check for converted bookings that need revenue entries
-- Run this in your Supabase SQL Editor to see what data exists

-- 1. Check all converted bookings
SELECT 
  b.id,
  b.company_id,
  b.invitee_name,
  b.is_converted,
  b.conversion_amount,
  b.conversion_currency,
  b.start_time,
  b.converted_at,
  -- Check if revenue entry exists
  CASE 
    WHEN EXISTS (SELECT 1 FROM revenue_entries re WHERE re.id = 'booking-conversion-' || b.id) 
    THEN 'Has revenue entry'
    ELSE 'MISSING revenue entry'
  END as revenue_status
FROM bookings b
WHERE b.is_converted = true
  AND b.conversion_amount IS NOT NULL
  AND b.conversion_amount > 0
ORDER BY b.converted_at DESC;

-- 2. Count summary
SELECT 
  COUNT(*) as total_converted_bookings,
  SUM(CASE WHEN EXISTS (SELECT 1 FROM revenue_entries re WHERE re.id = 'booking-conversion-' || b.id) THEN 1 ELSE 0 END) as with_revenue_entries,
  SUM(CASE WHEN NOT EXISTS (SELECT 1 FROM revenue_entries re WHERE re.id = 'booking-conversion-' || b.id) THEN 1 ELSE 0 END) as missing_revenue_entries,
  SUM(b.conversion_amount) as total_conversion_amount
FROM bookings b
WHERE b.is_converted = true
  AND b.conversion_amount IS NOT NULL
  AND b.conversion_amount > 0;

-- 3. Check existing revenue entries
SELECT 
  id,
  company_id,
  entry_date,
  amount,
  description,
  booking_id,
  metadata
FROM revenue_entries
ORDER BY created_at DESC
LIMIT 20;
