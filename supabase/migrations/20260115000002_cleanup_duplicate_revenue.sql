-- Remove duplicate revenue entries created before fixes
-- Strategy: Keep booking-conversion- format, delete booking- format
-- This fixes the issue where £16,000 is showing from 2 entries instead of £8,000 from 1 entry

-- Find and remove duplicate booking conversion entries
-- Keeps the most recent entry with booking-conversion- prefix
-- Deletes all other duplicates for same booking_id
WITH duplicates AS (
  SELECT
    id,
    metadata->>'booking_id' as booking_id,
    ROW_NUMBER() OVER (
      PARTITION BY company_id, metadata->>'booking_id'
      ORDER BY
        -- Prefer booking-conversion- format (0 comes before 1)
        CASE WHEN id LIKE 'booking-conversion-%' THEN 0 ELSE 1 END,
        -- If both have same format, keep most recent
        created_at DESC
    ) as rn
  FROM revenue_entries
  WHERE metadata->>'booking_id' IS NOT NULL
)
DELETE FROM revenue_entries
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);

-- Log the cleanup results
DO $$
DECLARE
  deleted_count INTEGER;
BEGIN
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE 'Cleaned up % duplicate revenue entries', deleted_count;
END $$;
