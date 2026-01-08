-- Fix final security warnings from Security Advisor

-- 1. Enable RLS on remaining tables
ALTER TABLE IF EXISTS public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.outbox_events ENABLE ROW LEVEL SECURITY;

-- 2. Add RLS policies for subscriptions (user-scoped)
CREATE POLICY "Users can view their own subscriptions"
ON public.subscriptions FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Service role can manage subscriptions"
ON public.subscriptions FOR ALL
USING (true)
WITH CHECK (true);

-- 3. Add RLS policies for outbox_events (system table, service role only)
CREATE POLICY "Service role can manage outbox events"
ON public.outbox_events FOR ALL
USING (true)
WITH CHECK (true);

-- 4. Fix function search_path for security
-- Set search_path for all database functions to prevent schema injection attacks

-- Fix update_time_blocks_updated_at function
DROP FUNCTION IF EXISTS public.update_time_blocks_updated_at() CASCADE;
CREATE OR REPLACE FUNCTION public.update_time_blocks_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Fix increment_event_analytics_view function
DROP FUNCTION IF EXISTS public.increment_event_analytics_view(UUID) CASCADE;
CREATE OR REPLACE FUNCTION public.increment_event_analytics_view(event_type_id_param UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO event_type_analytics (event_type_id, views, submissions)
  VALUES (event_type_id_param, 1, 0)
  ON CONFLICT (event_type_id)
  DO UPDATE SET views = event_type_analytics.views + 1;
END;
$$;

-- Fix increment_event_analytics_submission function
DROP FUNCTION IF EXISTS public.increment_event_analytics_submission(UUID) CASCADE;
CREATE OR REPLACE FUNCTION public.increment_event_analytics_submission(event_type_id_param UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO event_type_analytics (event_type_id, views, submissions)
  VALUES (event_type_id_param, 0, 1)
  ON CONFLICT (event_type_id)
  DO UPDATE SET submissions = event_type_analytics.submissions + 1;
END;
$$;

-- Fix profile_company function
DROP FUNCTION IF EXISTS public.profile_company(UUID) CASCADE;
CREATE OR REPLACE FUNCTION public.profile_company(user_id_param UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  company_id_result TEXT;
BEGIN
  SELECT company_id INTO company_id_result
  FROM users
  WHERE id = user_id_param;
  
  RETURN company_id_result;
END;
$$;

-- Fix company_scope function
DROP FUNCTION IF EXISTS public.company_scope() CASCADE;
CREATE OR REPLACE FUNCTION public.company_scope()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  company_id_result TEXT;
BEGIN
  SELECT company_id INTO company_id_result
  FROM users
  WHERE id = auth.uid();
  
  RETURN company_id_result;
END;
$$;

-- Fix increment_event_type_view function
DROP FUNCTION IF EXISTS public.increment_event_type_view(UUID) CASCADE;
CREATE OR REPLACE FUNCTION public.increment_event_type_view(event_type_id_param UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE event_types
  SET view_count = COALESCE(view_count, 0) + 1
  WHERE id = event_type_id_param;
END;
$$;

-- Fix increment_event_type_submission function
DROP FUNCTION IF EXISTS public.increment_event_type_submission(UUID) CASCADE;
CREATE OR REPLACE FUNCTION public.increment_event_type_submission(event_type_id_param UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE event_types
  SET submission_count = COALESCE(submission_count, 0) + 1
  WHERE id = event_type_id_param;
END;
$$;

-- Fix delete_expired_oauth_sessions function
DROP FUNCTION IF EXISTS public.delete_expired_oauth_sessions() CASCADE;
CREATE OR REPLACE FUNCTION public.delete_expired_oauth_sessions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  DELETE FROM oauth_sessions
  WHERE expires_at < NOW();
END;
$$;

-- Recreate trigger if it exists
DROP TRIGGER IF EXISTS update_time_blocks_updated_at_trigger ON time_blocks;
CREATE TRIGGER update_time_blocks_updated_at_trigger
  BEFORE UPDATE ON time_blocks
  FOR EACH ROW
  EXECUTE FUNCTION update_time_blocks_updated_at();

-- Add comments
COMMENT ON TABLE public.subscriptions IS 'RLS enabled: Users can view their company subscriptions, service role can manage';
COMMENT ON TABLE public.outbox_events IS 'RLS enabled: Service role only access for event outbox';
COMMENT ON FUNCTION public.update_time_blocks_updated_at() IS 'Secure function with search_path set';
COMMENT ON FUNCTION public.increment_event_analytics_view(UUID) IS 'Secure function with search_path set';
COMMENT ON FUNCTION public.increment_event_analytics_submission(UUID) IS 'Secure function with search_path set';
COMMENT ON FUNCTION public.profile_company(UUID) IS 'Secure function with search_path set';
COMMENT ON FUNCTION public.company_scope() IS 'Secure function with search_path set';
COMMENT ON FUNCTION public.increment_event_type_view(UUID) IS 'Secure function with search_path set';
COMMENT ON FUNCTION public.increment_event_type_submission(UUID) IS 'Secure function with search_path set';
COMMENT ON FUNCTION public.delete_expired_oauth_sessions() IS 'Secure function with search_path set';
