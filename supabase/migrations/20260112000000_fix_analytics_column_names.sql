-- Fix analytics tracking column names
-- The previous migration 20260108000013 used wrong column names (views/submissions instead of view_count/submission_count)
-- This migration corrects the RPC functions to use the correct column names that exist in event_type_analytics table

-- Fix increment_event_analytics_view function
DROP FUNCTION IF EXISTS public.increment_event_analytics_view(UUID) CASCADE;
CREATE OR REPLACE FUNCTION public.increment_event_analytics_view(event_type_id_param UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO event_type_analytics (event_type_id, view_count, submission_count)
  VALUES (event_type_id_param, 1, 0)
  ON CONFLICT (event_type_id)
  DO UPDATE SET view_count = event_type_analytics.view_count + 1;
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
  INSERT INTO event_type_analytics (event_type_id, view_count, submission_count)
  VALUES (event_type_id_param, 0, 1)
  ON CONFLICT (event_type_id)
  DO UPDATE SET submission_count = event_type_analytics.submission_count + 1;
END;
$$;

-- Update comments
COMMENT ON FUNCTION public.increment_event_analytics_view(UUID) IS 'Increments view count in event_type_analytics table (fixed column names)';
COMMENT ON FUNCTION public.increment_event_analytics_submission(UUID) IS 'Increments submission count in event_type_analytics table (fixed column names)';
