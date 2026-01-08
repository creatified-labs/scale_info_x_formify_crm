-- Fix booking_slug_prefix to use branding_name instead of defaulting to 'formifycrm'
-- This ensures booking URLs use the company's display name

-- Update companies that have a branding_name but booking_slug_prefix is 'formifycrm' or NULL
UPDATE companies
SET booking_slug_prefix = LOWER(REGEXP_REPLACE(branding_name, '[^a-zA-Z0-9]+', '', 'g'))
WHERE branding_name IS NOT NULL 
  AND branding_name != ''
  AND (booking_slug_prefix IS NULL OR booking_slug_prefix = 'formifycrm')
  AND LOWER(REGEXP_REPLACE(branding_name, '[^a-zA-Z0-9]+', '', 'g')) != 'formifycrm';

-- Update companies that have a name but no branding_name and booking_slug_prefix is 'formifycrm' or NULL
UPDATE companies
SET booking_slug_prefix = LOWER(REGEXP_REPLACE(name, '[^a-zA-Z0-9]+', '', 'g'))
WHERE (branding_name IS NULL OR branding_name = '')
  AND name IS NOT NULL 
  AND name != ''
  AND (booking_slug_prefix IS NULL OR booking_slug_prefix = 'formifycrm')
  AND LOWER(REGEXP_REPLACE(name, '[^a-zA-Z0-9]+', '', 'g')) != 'formifycrm';

-- For any remaining companies without a booking_slug_prefix, generate one from their ID
UPDATE companies
SET booking_slug_prefix = 'company-' || SUBSTRING(id, 1, 8)
WHERE booking_slug_prefix IS NULL;
