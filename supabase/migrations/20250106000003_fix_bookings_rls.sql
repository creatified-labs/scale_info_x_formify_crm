-- Ensure bookings table has proper RLS policies for service role
-- Drop existing policies if they exist and recreate them

DROP POLICY IF EXISTS "Hosts can view their bookings" ON public.bookings;
DROP POLICY IF EXISTS "Hosts can update their bookings" ON public.bookings;
DROP POLICY IF EXISTS "Service role full access" ON public.bookings;
DROP POLICY IF EXISTS "service_role_policy" ON public.bookings;

-- Policy 1: Hosts can view bookings for their event types
CREATE POLICY "Hosts can view their bookings"
ON public.bookings
FOR SELECT
USING (
  host_user_id = auth.uid()
  OR
  EXISTS (
    SELECT 1 FROM public.event_types
    WHERE event_types.id = bookings.event_type_id
    AND event_types.user_id = auth.uid()
  )
);

-- Policy 2: Hosts can update their bookings (for cancellation, rescheduling)
CREATE POLICY "Hosts can update their bookings"
ON public.bookings
FOR UPDATE
USING (
  host_user_id = auth.uid()
  OR
  EXISTS (
    SELECT 1 FROM public.event_types
    WHERE event_types.id = bookings.event_type_id
    AND event_types.user_id = auth.uid()
  )
);

-- Policy 3: Service role can insert (for public booking creation via Edge Functions)
-- Using a simpler check that works with service role key
CREATE POLICY "Service role can insert bookings"
ON public.bookings
FOR INSERT
WITH CHECK (true);

-- Policy 4: Service role can select all (for Edge Functions)
CREATE POLICY "Service role can select all bookings"
ON public.bookings
FOR SELECT
USING (
  -- Allow if using service role key (bypasses RLS anyway)
  -- OR if user is the host
  host_user_id = auth.uid()
  OR
  EXISTS (
    SELECT 1 FROM public.event_types
    WHERE event_types.id = bookings.event_type_id
    AND event_types.user_id = auth.uid()
  )
  OR
  -- Allow all access for service role
  current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
);

-- Policy 5: Service role can update all
CREATE POLICY "Service role can update all bookings"
ON public.bookings
FOR UPDATE
USING (
  host_user_id = auth.uid()
  OR
  EXISTS (
    SELECT 1 FROM public.event_types
    WHERE event_types.id = bookings.event_type_id
    AND event_types.user_id = auth.uid()
  )
  OR
  current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
);

-- Ensure RLS is enabled
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- Grant necessary permissions to service role
GRANT ALL ON public.bookings TO service_role;
