-- Ensure Scale Info companies use 'scaleinfo' as booking_slug_prefix
-- This fixes the default booking URL to be /book/scaleinfo/ instead of /book/formifycrm/

-- Update any company with "Scale Info" branding to use scaleinfo slug
UPDATE companies
SET booking_slug_prefix = 'scaleinfo'
WHERE (
  branding_name ILIKE '%scale%info%' 
  OR branding_display_name ILIKE '%scale%info%'
  OR name ILIKE '%scale%info%'
)
AND booking_slug_prefix != 'scaleinfo';

-- Also update the main Whop company if it exists
UPDATE companies
SET booking_slug_prefix = 'scaleinfo',
    branding_name = COALESCE(branding_name, 'Scale Info'),
    branding_display_name = COALESCE(branding_display_name, 'Scale Info')
WHERE whop_company_id = 'biz_5c2wnbWihQovAt'
AND booking_slug_prefix != 'scaleinfo';
