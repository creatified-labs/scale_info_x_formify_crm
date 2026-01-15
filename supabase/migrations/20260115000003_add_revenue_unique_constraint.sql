-- Prevent duplicate booking conversions at database level
-- This creates a partial unique index that only applies to rows with booking_id

-- Create unique index on (company_id, booking_id) to prevent duplicates
-- Uses CONCURRENTLY to avoid locking the table during index creation
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS idx_revenue_entries_unique_booking
ON revenue_entries (company_id, (metadata->>'booking_id'))
WHERE metadata->>'booking_id' IS NOT NULL;

-- Benefits:
-- - Prevents multiple revenue entries for same booking within a company
-- - Only applies to booking conversions (manual entries unaffected since they have no booking_id)
-- - Allows different companies to have revenue entries for different bookings
-- - Uses CONCURRENTLY to avoid blocking other operations

COMMENT ON INDEX idx_revenue_entries_unique_booking IS
'Ensures each booking can only have one revenue entry per company. Prevents duplicate revenue from manual conversions and webhook triggers.';
