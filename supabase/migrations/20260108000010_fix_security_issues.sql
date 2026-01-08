-- Fix Security Advisor Issues
-- This migration addresses RLS and security vulnerabilities

-- 1. Enable RLS on all public tables that are missing it
ALTER TABLE public.calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forms ENABLE ROW LEVEL SECURITY;

-- 2. Add RLS policies for calls table
-- Users can only see calls for their company
CREATE POLICY "Users can view their company calls"
ON public.calls FOR SELECT
USING (
  tenant_id IN (
    SELECT company_id FROM users WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can insert their company calls"
ON public.calls FOR INSERT
WITH CHECK (
  tenant_id IN (
    SELECT company_id FROM users WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can update their company calls"
ON public.calls FOR UPDATE
USING (
  tenant_id IN (
    SELECT company_id FROM users WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can delete their company calls"
ON public.calls FOR DELETE
USING (
  tenant_id IN (
    SELECT company_id FROM users WHERE id = auth.uid()
  )
);

-- 3. Add RLS policies for forms table
CREATE POLICY "Users can view their own forms"
ON public.forms FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own forms"
ON public.forms FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own forms"
ON public.forms FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own forms"
ON public.forms FOR DELETE
USING (user_id = auth.uid());

-- 4. Add RLS policies for form_submissions table
CREATE POLICY "Users can view their form submissions"
ON public.form_submissions FOR SELECT
USING (
  form_id IN (
    SELECT id FROM forms WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Anyone can insert form submissions"
ON public.form_submissions FOR INSERT
WITH CHECK (true);

CREATE POLICY "Users can update their form submissions"
ON public.form_submissions FOR UPDATE
USING (
  form_id IN (
    SELECT id FROM forms WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete their form submissions"
ON public.form_submissions FOR DELETE
USING (
  form_id IN (
    SELECT id FROM forms WHERE user_id = auth.uid()
  )
);

-- 5. Add comments explaining the security model
COMMENT ON TABLE public.calls IS 'RLS enabled: Users can only access calls for their company';
COMMENT ON TABLE public.forms IS 'RLS enabled: Users can only access their own forms';
COMMENT ON TABLE public.form_submissions IS 'RLS enabled: Public can submit, users can view submissions for their forms';
