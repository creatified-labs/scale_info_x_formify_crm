-- Fix call_logs RLS policies to work with public bookings and service role
-- Allow service role to bypass RLS, and make INSERT more permissive for Edge Functions

-- Drop and recreate INSERT policy to be more permissive
DROP POLICY IF EXISTS "Users can insert call logs for their company" ON public.call_logs;

CREATE POLICY "Users can insert call logs for their company"
ON public.call_logs
FOR INSERT
WITH CHECK (
  -- Allow if user is authenticated and company matches
  (
    auth.uid() IS NOT NULL
    AND company_id IN (
      SELECT company_id FROM public.profiles WHERE id = auth.uid()
    )
  )
  OR
  -- Allow service role to insert (for Edge Functions)
  current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
);

-- Ensure SELECT policy also allows service role
DROP POLICY IF EXISTS "Users can view call logs for their company" ON public.call_logs;

CREATE POLICY "Users can view call logs for their company"
ON public.call_logs
FOR SELECT
USING (
  company_id IN (
    SELECT company_id FROM public.profiles WHERE id = auth.uid()
  )
  OR
  current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
);

-- Update UPDATE policy
DROP POLICY IF EXISTS "Users can update call logs for their company" ON public.call_logs;

CREATE POLICY "Users can update call logs for their company"
ON public.call_logs
FOR UPDATE
USING (
  company_id IN (
    SELECT company_id FROM public.profiles WHERE id = auth.uid()
  )
  OR
  current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
);

-- Update DELETE policy
DROP POLICY IF EXISTS "Users can delete call logs for their company" ON public.call_logs;

CREATE POLICY "Users can delete call logs for their company"
ON public.call_logs
FOR DELETE
USING (
  company_id IN (
    SELECT company_id FROM public.profiles WHERE id = auth.uid()
  )
  OR
  current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
);

-- Grant necessary permissions
GRANT ALL ON public.call_logs TO service_role;
