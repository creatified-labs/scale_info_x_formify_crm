-- Create function to increment view count for event type analytics
CREATE OR REPLACE FUNCTION increment_event_analytics_view(p_event_type_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.event_type_analytics (event_type_id, view_count, last_viewed_at)
  VALUES (p_event_type_id, 1, NOW())
  ON CONFLICT (event_type_id)
  DO UPDATE
  SET view_count = event_type_analytics.view_count + 1,
      last_viewed_at = NOW(),
      updated_at = NOW();
END;
$$;

-- Create function to increment submission count for event type analytics
CREATE OR REPLACE FUNCTION increment_event_analytics_submission(p_event_type_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.event_type_analytics (event_type_id, submission_count, last_submitted_at)
  VALUES (p_event_type_id, 1, NOW())
  ON CONFLICT (event_type_id)
  DO UPDATE
  SET submission_count = event_type_analytics.submission_count + 1,
      last_submitted_at = NOW(),
      updated_at = NOW();
END;
$$;

-- Grant execute permissions to authenticated users and service role
GRANT EXECUTE ON FUNCTION increment_event_analytics_view(UUID) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION increment_event_analytics_submission(UUID) TO authenticated, anon, service_role;
