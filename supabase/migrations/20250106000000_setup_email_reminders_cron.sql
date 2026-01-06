-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Grant usage to postgres user (required for Supabase)
GRANT USAGE ON SCHEMA cron TO postgres;

-- Schedule the process-email-reminders function to run every minute
SELECT cron.schedule(
  'process-email-reminders-job', -- Job name
  '* * * * *', -- Cron expression (every minute)
  $$
  SELECT
    net.http_post(
      url := current_setting('app.settings.supabase_url') || '/functions/v1/process-email-reminders',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
      ),
      body := '{}'::jsonb
    ) AS request_id;
  $$
);

-- Store Supabase URL and service role key in database settings
-- These will be used by the cron job
-- Note: You'll need to set these via the Supabase dashboard or by running:
-- ALTER DATABASE postgres SET app.settings.supabase_url TO 'https://rwmmiosgsncsxiehkyyd.supabase.co';
-- ALTER DATABASE postgres SET app.settings.service_role_key TO 'your-service-role-key';

-- Add comment to the scheduled job
COMMENT ON EXTENSION pg_cron IS 'Job scheduler for PostgreSQL';
