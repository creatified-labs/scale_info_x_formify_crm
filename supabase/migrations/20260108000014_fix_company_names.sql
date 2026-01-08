-- Fix company names that are showing Whop org IDs instead of friendly names

-- Update companies where the name is a Whop org ID (starts with biz_)
UPDATE companies
SET 
  name = 'Scale Info',
  branding_name = 'Scale Info',
  branding_display_name = 'Scale Info'
WHERE 
  (name LIKE 'biz_%' OR branding_name LIKE 'biz_%' OR branding_display_name LIKE 'biz_%')
  AND name != 'Scale Info';

-- Also update any NULL or empty branding names
UPDATE companies
SET 
  branding_name = 'Scale Info',
  branding_display_name = 'Scale Info'
WHERE 
  (branding_name IS NULL OR branding_name = '' OR branding_display_name IS NULL OR branding_display_name = '')
  AND name != 'Scale Info';

-- Update booking slug prefix if it's still the old default
-- Generate unique slugs by appending the first 8 chars of the company ID
UPDATE companies
SET booking_slug_prefix = 'scaleinfo-' || SUBSTRING(id::text, 1, 8)
WHERE (booking_slug_prefix LIKE 'biz%' OR booking_slug_prefix = 'formifycrm')
  AND booking_slug_prefix != 'scaleinfo';
