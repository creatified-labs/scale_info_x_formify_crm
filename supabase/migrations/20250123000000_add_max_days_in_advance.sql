-- Add max_days_in_advance column to event_types table
ALTER TABLE public.event_types
ADD COLUMN max_days_in_advance INTEGER DEFAULT NULL;

COMMENT ON COLUMN public.event_types.max_days_in_advance IS
  'Maximum number of days in advance that bookings can be made. NULL means unlimited.';
