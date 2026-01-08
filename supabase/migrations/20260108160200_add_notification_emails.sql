-- Add notification_emails array to companies table
ALTER TABLE public.companies 
ADD COLUMN IF NOT EXISTS notification_emails TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Add comment
COMMENT ON COLUMN public.companies.notification_emails IS 'Array of email addresses to notify for bookings';
