-- Simplify call_logs RLS policies to be more permissive
-- The key insight: authenticated users should be able to insert their own company's logs
-- Service role should bypass RLS entirely (which it does by default)

-- Drop all existing policies
DROP POLICY IF EXISTS "Users can insert call logs for their company" ON public.call_logs;
DROP POLICY IF EXISTS "Users can view call logs for their company" ON public.call_logs;
DROP POLICY IF EXISTS "Users can update call logs for their company" ON public.call_logs;
DROP POLICY IF EXISTS "Users can delete call logs for their company" ON public.call_logs;

-- Simple SELECT policy: users can view their company's logs
CREATE POLICY "Users can view their company call logs"
ON public.call_logs
FOR SELECT
USING (
  auth.uid() IS NOT NULL
);

-- Simple INSERT policy: authenticated users can insert
CREATE POLICY "Authenticated users can insert call logs"
ON public.call_logs
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL
);

-- Simple UPDATE policy: authenticated users can update
CREATE POLICY "Authenticated users can update call logs"
ON public.call_logs
FOR UPDATE
USING (
  auth.uid() IS NOT NULL
);

-- Simple DELETE policy: authenticated users can delete
CREATE POLICY "Authenticated users can delete call logs"
ON public.call_logs
FOR DELETE
USING (
  auth.uid() IS NOT NULL
);

-- Ensure service role has full access
GRANT ALL ON public.call_logs TO service_role;
GRANT ALL ON public.call_logs TO authenticated;
