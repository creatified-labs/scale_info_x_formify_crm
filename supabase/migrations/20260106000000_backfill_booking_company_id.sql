-- Backfill company_id for existing bookings based on their event_type's company_id
-- Only run if the column exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'bookings' 
    AND column_name = 'company_id'
  ) THEN
    UPDATE bookings
    SET company_id = event_types.company_id
    FROM event_types
    WHERE bookings.event_type_id = event_types.id
      AND bookings.company_id IS NULL
      AND event_types.company_id IS NOT NULL;
  END IF;
END $$;
