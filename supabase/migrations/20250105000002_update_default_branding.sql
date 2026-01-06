-- Update the company to have "Scale Info" as the default branding and booking slug
UPDATE companies
SET
  branding_name = 'Scale Info',
  branding_display_name = 'Scale Info',
  booking_slug_prefix = 'scaleinfo'
WHERE whop_company_id = 'biz_5c2wnbWihQovAt'
  AND (branding_name IS NULL OR branding_name = '');

-- Also update if branding_name exists but booking_slug_prefix doesn't match
UPDATE companies
SET booking_slug_prefix = 'scaleinfo'
WHERE whop_company_id = 'biz_5c2wnbWihQovAt'
  AND booking_slug_prefix = 'formifycrm';
