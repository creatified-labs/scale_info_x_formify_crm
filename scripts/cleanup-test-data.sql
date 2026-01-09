-- ⚠️  PRODUCTION DATABASE CLEANUP SCRIPT
-- Run this in Supabase SQL Editor for your PRODUCTION database
-- This removes any test/mock data that may have been created during development

-- IMPORTANT: Review each section before running!
-- Consider backing up your database first.

-- ============================================================================
-- 1. REMOVE MOCK BOOKINGS (identifiable by example.com emails)
-- ============================================================================
BEGIN;

-- First, delete revenue entries linked to test bookings
DELETE FROM revenue_entries
WHERE booking_id IN (
  SELECT id FROM bookings
  WHERE invitee_email LIKE '%@example.com'
  OR invitee_email LIKE '%@localhost.test'
);

-- Then delete the test bookings themselves
DELETE FROM bookings
WHERE invitee_email LIKE '%@example.com'
OR invitee_email LIKE '%@localhost.test';

COMMIT;

-- ============================================================================
-- 2. REMOVE TEST REVENUE ENTRIES (identifiable by source or description)
-- ============================================================================
BEGIN;

-- Remove mock revenue entries with test descriptions
DELETE FROM revenue_entries
WHERE description IN ('Affiliate Sale', 'Direct Sale', 'Upsell', 'Renewal', 'Referral')
AND source = 'manual'
AND created_at::date >= CURRENT_DATE - INTERVAL '60 days'; -- Only recent ones

COMMIT;

-- ============================================================================
-- 3. VERIFY CLEANUP RESULTS
-- ============================================================================

-- Check for any remaining test data
SELECT
  'Test Bookings Remaining' as check_type,
  COUNT(*) as count
FROM bookings
WHERE invitee_email LIKE '%@example.com'
OR invitee_email LIKE '%@localhost.test'

UNION ALL

SELECT
  'Test Revenue Entries Remaining' as check_type,
  COUNT(*) as count
FROM revenue_entries
WHERE booking_id IS NULL
AND description IN ('Affiliate Sale', 'Direct Sale', 'Upsell', 'Renewal', 'Referral');

-- ============================================================================
-- 4. OPTIONAL: REMOVE TEST COMPANIES
-- ============================================================================
-- ⚠️  DANGER ZONE - Only run if you're sure these are test companies!
-- Uncomment and modify the company IDs as needed

/*
BEGIN;

-- List companies with suspicious/test names
SELECT id, name, whop_company_id
FROM companies
WHERE name IN ('Scale Info', 'Local Dev Company', 'Test Company')
OR whop_company_id = 'biz_5c2wnbWihQovAt';  -- Your dev company ID

-- To delete a specific test company (CAREFUL!):
-- DELETE FROM companies WHERE whop_company_id = 'biz_YOUR_TEST_COMPANY_ID';

COMMIT;
*/

-- ============================================================================
-- 5. VERIFY DATA INTEGRITY
-- ============================================================================

-- Ensure all bookings have valid references
SELECT
  COUNT(*) as orphaned_bookings
FROM bookings b
LEFT JOIN event_types et ON b.event_type_id = et.id
WHERE et.id IS NULL;

-- Ensure all revenue entries have valid references
SELECT
  COUNT(*) as orphaned_revenue
FROM revenue_entries re
LEFT JOIN companies c ON re.company_id = c.id
WHERE c.id IS NULL;

-- ============================================================================
-- COMPLETION CHECK
-- ============================================================================
SELECT
  '✅ Cleanup script completed!' as status,
  CURRENT_TIMESTAMP as completed_at;
