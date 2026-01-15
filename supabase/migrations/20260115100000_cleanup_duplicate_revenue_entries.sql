-- Cleanup duplicate revenue entries caused by both edge function and DataContext creating entries
-- This migration removes duplicate entries where the same booking has multiple revenue entries

-- Step 1: Delete revenue entries with metadata.callId that have a corresponding booking-conversion entry
-- These are duplicates created by DataContext.updateCall when convert-booking edge function already created one
DELETE FROM revenue_entries
WHERE id IN (
  SELECT re1.id
  FROM revenue_entries re1
  INNER JOIN revenue_entries re2 ON re2.id LIKE 'booking-conversion-%'
  INNER JOIN call_logs cl ON cl.id = (re1.metadata->>'callId')::uuid
  WHERE re1.metadata->>'callId' IS NOT NULL
    AND cl.booking_id IS NOT NULL
    AND re2.id = 'booking-conversion-' || cl.booking_id
    AND re1.company_id = re2.company_id
);

-- Step 2: Also clean up any entries where metadata.booking_id matches another entry's booking_id column
-- This handles cases where booking_id was stored in both places
DELETE FROM revenue_entries
WHERE id IN (
  SELECT re1.id
  FROM revenue_entries re1
  INNER JOIN revenue_entries re2 ON re2.booking_id = (re1.metadata->>'booking_id')::uuid
  WHERE re1.metadata->>'booking_id' IS NOT NULL
    AND re1.booking_id IS NULL
    AND re1.id != re2.id
    AND re1.company_id = re2.company_id
);

-- Log the cleanup
DO $$
BEGIN
  RAISE NOTICE 'Duplicate revenue entries cleanup completed';
END $$;
