-- Add deleted_at column to event_types for soft deletes
ALTER TABLE public.event_types ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Add index for better performance when filtering out deleted records
CREATE INDEX IF NOT EXISTS idx_event_types_deleted_at ON public.event_types(deleted_at) WHERE deleted_at IS NULL;

-- Add deleted_at to other tables that might need soft deletes
ALTER TABLE public.forms ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE public.calls ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_forms_deleted_at ON public.forms(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_bookings_deleted_at ON public.bookings(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_calls_deleted_at ON public.calls(deleted_at) WHERE deleted_at IS NULL;
