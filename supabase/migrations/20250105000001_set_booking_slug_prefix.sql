-- Set booking_slug_prefix for existing companies
-- This allows using custom slugs in booking URLs like /book/formifycrm/event-slug
-- instead of /book/biz_xxx/event-slug

-- Update companies that have a whop_company_id but no booking_slug_prefix
-- Use a slugified version of the company name
UPDATE companies
SET booking_slug_prefix = LOWER(REGEXP_REPLACE(name, '[^a-zA-Z0-9]+', '', 'g'))
WHERE booking_slug_prefix IS NULL
  AND name IS NOT NULL
  AND name != '';

-- For the main Whop company (biz_5c2wnbWihQovAt), set it to 'formifycrm'
UPDATE companies
SET booking_slug_prefix = 'formifycrm'
WHERE whop_company_id = 'biz_5c2wnbWihQovAt';

-- Add a unique constraint to prevent duplicate booking slugs
-- Drop if exists first to avoid errors
ALTER TABLE companies DROP CONSTRAINT IF EXISTS companies_booking_slug_prefix_key;
ALTER TABLE companies ADD CONSTRAINT companies_booking_slug_prefix_key UNIQUE (booking_slug_prefix);

-- Add an index for faster lookups
CREATE INDEX IF NOT EXISTS idx_companies_booking_slug_prefix ON companies(booking_slug_prefix);
