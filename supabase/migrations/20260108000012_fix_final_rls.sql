-- Fix final remaining RLS disabled tables from Security Advisor

-- Enable RLS on remaining tables
ALTER TABLE IF EXISTS public.event_type_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.tenant_daily_call_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.tenant_totals ENABLE ROW LEVEL SECURITY;

-- Add RLS policies for event_type_analytics (user-scoped)
CREATE POLICY "Users can view their event type analytics"
ON public.event_type_analytics FOR SELECT
USING (
  event_type_id IN (
    SELECT id FROM event_types WHERE user_id = auth.uid()
  )
);

CREATE POLICY "System can insert event type analytics"
ON public.event_type_analytics FOR INSERT
WITH CHECK (true);

-- Add RLS policies for tenant_daily_call_stats (company-scoped)
CREATE POLICY "Users can view their company daily call stats"
ON public.tenant_daily_call_stats FOR SELECT
USING (
  tenant_id IN (
    SELECT company_id FROM users WHERE id = auth.uid()
  )
);

CREATE POLICY "System can manage tenant daily call stats"
ON public.tenant_daily_call_stats FOR INSERT
WITH CHECK (true);

CREATE POLICY "System can update tenant daily call stats"
ON public.tenant_daily_call_stats FOR UPDATE
USING (true);

-- Add RLS policies for tenant_totals (company-scoped)
CREATE POLICY "Users can view their company tenant totals"
ON public.tenant_totals FOR SELECT
USING (
  tenant_id IN (
    SELECT company_id FROM users WHERE id = auth.uid()
  )
);

CREATE POLICY "System can manage tenant totals"
ON public.tenant_totals FOR INSERT
WITH CHECK (true);

CREATE POLICY "System can update tenant totals"
ON public.tenant_totals FOR UPDATE
USING (true);

-- Add comments
COMMENT ON TABLE public.event_type_analytics IS 'RLS enabled: Users can view analytics for their event types';
COMMENT ON TABLE public.tenant_daily_call_stats IS 'RLS enabled: Users can view their company daily call stats';
COMMENT ON TABLE public.tenant_totals IS 'RLS enabled: Users can view their company tenant totals';
