-- Fix all remaining RLS disabled tables from Security Advisor

-- Enable RLS on all tables that are currently disabled
ALTER TABLE IF EXISTS public.availability_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.availability_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.call_audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.email_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.event_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.form_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.integration_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.revenue_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.sales_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.webhooks ENABLE ROW LEVEL SECURITY;

-- Add RLS policies for availability_overrides
CREATE POLICY "Users can manage their own availability overrides"
ON public.availability_overrides FOR ALL
USING (user_id = auth.uid());

-- Add RLS policies for availability_rules
CREATE POLICY "Users can manage their own availability rules"
ON public.availability_rules FOR ALL
USING (user_id = auth.uid());

-- Add RLS policies for call_audits (read-only for company users)
CREATE POLICY "Users can view their company call audits"
ON public.call_audits FOR SELECT
USING (
  call_id IN (
    SELECT id FROM calls WHERE tenant_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  )
);

-- Add RLS policies for email_logs (company-scoped)
CREATE POLICY "Users can view their company email logs"
ON public.email_logs FOR SELECT
USING (
  company_id IN (
    SELECT company_id FROM users WHERE id = auth.uid()
  )
);

CREATE POLICY "System can insert email logs"
ON public.email_logs FOR INSERT
WITH CHECK (true);

-- Add RLS policies for email_reminders (company-scoped)
CREATE POLICY "Users can manage their company email reminders"
ON public.email_reminders FOR ALL
USING (
  booking_id IN (
    SELECT id FROM bookings WHERE host_user_id = auth.uid()
  )
);

-- Add RLS policies for email_templates (company-scoped)
CREATE POLICY "Users can manage their company email templates"
ON public.email_templates FOR ALL
USING (
  company_id IN (
    SELECT company_id FROM users WHERE id = auth.uid()
  )
);

-- Add RLS policies for form_fields (based on form ownership)
CREATE POLICY "Users can manage their form fields"
ON public.form_fields FOR ALL
USING (
  form_id IN (
    SELECT id FROM forms WHERE user_id = auth.uid()
  )
);

-- Add RLS policies for integration_accounts (user-scoped)
CREATE POLICY "Users can manage their own integration accounts"
ON public.integration_accounts FOR ALL
USING (user_id = auth.uid());

-- Add RLS policies for revenue_categories (company-scoped)
CREATE POLICY "Users can manage their company revenue categories"
ON public.revenue_categories FOR ALL
USING (
  company_id IN (
    SELECT company_id FROM users WHERE id = auth.uid()
  )
);

-- Add RLS policies for sales_goals (company-scoped)
CREATE POLICY "Users can manage their company sales goals"
ON public.sales_goals FOR ALL
USING (
  company_id IN (
    SELECT company_id FROM users WHERE id = auth.uid()
  )
);

-- Add RLS policies for webhooks (user-scoped)
CREATE POLICY "Users can manage their own webhooks"
ON public.webhooks FOR ALL
USING (user_id = auth.uid());

-- Add comments
COMMENT ON TABLE public.email_logs IS 'RLS enabled: Users can view their company email logs, system can insert';
COMMENT ON TABLE public.email_templates IS 'RLS enabled: Users can manage their company email templates';
COMMENT ON TABLE public.revenue_categories IS 'RLS enabled: Users can manage their company revenue categories';
COMMENT ON TABLE public.sales_goals IS 'RLS enabled: Users can manage their company sales goals';
