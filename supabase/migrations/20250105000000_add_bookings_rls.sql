-- Add RLS policies for bookings table
-- This allows hosts to view their bookings and enables service role to create bookings

-- Policy 1: Hosts can view bookings for their event types
CREATE POLICY "Hosts can view their bookings"
ON public.bookings
FOR SELECT
USING (
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
  EXISTS (
    SELECT 1 FROM public.event_types
    WHERE event_types.id = bookings.event_type_id
    AND event_types.user_id = auth.uid()
  )
);

-- Policy 3: Service role can do everything (for public booking creation via Edge Functions)
CREATE POLICY "Service role full access"
ON public.bookings
FOR ALL
USING (auth.jwt() ->> 'role' = 'service_role');

-- Note: We don't add a public INSERT policy because bookings are created via
-- the create-booking Edge Function which uses the service role key
