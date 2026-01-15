-- Diagnostic queries to understand the bookings table structure and data

-- 1. Check bookings table structure
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns
WHERE table_name = 'bookings'
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Check if there are ANY bookings at all
SELECT COUNT(*) as total_bookings FROM bookings;

-- 3. Check bookings with any conversion-related data
SELECT 
  id,
  invitee_name,
  start_time,
  status,
  -- Try to access conversion fields (may not exist)
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'bookings' 
    AND column_name = 'is_converted'
  ) THEN 'is_converted column exists' ELSE 'is_converted column MISSING' END as conversion_field_check
FROM bookings
LIMIT 5;

-- 4. Check call_logs table for conversion data (alternative source)
SELECT 
  id,
  client_name,
  call_date,
  is_converted,
  conversion_amount,
  booking_id,
  status
FROM call_logs
WHERE is_converted = true
  AND conversion_amount IS NOT NULL
  AND conversion_amount > 0
ORDER BY call_date DESC
LIMIT 10;

-- 5. Count converted calls
SELECT 
  COUNT(*) as total_converted_calls,
  SUM(conversion_amount) as total_conversion_amount
FROM call_logs
WHERE is_converted = true
  AND conversion_amount IS NOT NULL
  AND conversion_amount > 0;
