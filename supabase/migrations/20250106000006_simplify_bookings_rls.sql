-- Simplify bookings RLS policies
-- Service role needs full access for public booking creation
-- Authenticated users need to view/update their bookings

DROP POLICY IF EXISTS "Hosts can view their bookings" ON public.bookings;
DROP POLICY IF EXISTS "Hosts can update their bookings" ON public.bookings;
DROP POLICY IF EXISTS "Service role can insert bookings" ON public.bookings;
DROP POLICY IF EXISTS "Service role can select all bookings" ON public.bookings;
DROP POLICY IF EXISTS "Service role can update all bookings" ON public.bookings;

-- Policy 1: Authenticated users can view their bookings
CREATE POLICY "Users can view their bookings"
ON public.bookings
FOR SELECT
USING (
  auth.uid() IS NOT NULL
  AND (
    host_user_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM public.event_types
      WHERE event_types.id = bookings.event_type_id
      AND event_types.user_id = auth.uid()
    )
  )
);

-- Policy 2: Service role can insert (for public booking creation)
CREATE POLICY "Service role can insert bookings"
ON public.bookings
FOR INSERT
WITH CHECK (true);

-- Policy 3: Authenticated users can update their bookings
CREATE POLICY "Users can update their bookings"
ON public.bookings
FOR UPDATE
USING (
  auth.uid() IS NOT NULL
  AND (
    host_user_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM public.event_types
      WHERE event_types.id = bookings.event_type_id
      AND event_types.user_id = auth.uid()
    )
  )
);

-- Policy 4: Service role can update (for adding Google Meet links, etc.)
CREATE POLICY "Service role can update bookings"
ON public.bookings
FOR UPDATE
WITH CHECK (true);

-- Ensure proper grants
GRANT ALL ON public.bookings TO service_role;
GRANT SELECT, UPDATE ON public.bookings TO authenticated;
