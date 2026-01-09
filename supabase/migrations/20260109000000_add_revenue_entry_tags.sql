-- Add booking_id and event_type_id to revenue_entries for tagging/filtering
ALTER TABLE revenue_entries 
ADD COLUMN IF NOT EXISTS booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS event_type_id UUID REFERENCES event_types(id) ON DELETE SET NULL;

-- Create indexes for faster filtering
CREATE INDEX IF NOT EXISTS idx_revenue_entries_booking_id ON revenue_entries(booking_id);
CREATE INDEX IF NOT EXISTS idx_revenue_entries_event_type_id ON revenue_entries(event_type_id);

-- Add comments
COMMENT ON COLUMN revenue_entries.booking_id IS 'Optional link to the booking that generated this revenue';
COMMENT ON COLUMN revenue_entries.event_type_id IS 'Optional link to the event type that generated this revenue';
