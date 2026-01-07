-- Backfill company_id for existing bookings based on their event_type's company_id
UPDATE bookings
SET company_id = event_types.company_id
FROM event_types
WHERE bookings.event_type_id = event_types.id
  AND bookings.company_id IS NULL
  AND event_types.company_id IS NOT NULL;
