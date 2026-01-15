-- Clean up any duplicate revenue entries created after the initial cleanup
-- This handles duplicates that may have been created between the first migration
-- and when the webhook code fix was deployed

-- Remove duplicate entries, keeping booking-conversion- format
WITH duplicates AS (
  SELECT
    id,
    company_id,
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
  RAISE NOTICE 'Cleaned up % remaining duplicate revenue entries', deleted_count;
END $$;
