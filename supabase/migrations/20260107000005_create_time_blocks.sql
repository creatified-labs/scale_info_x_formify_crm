-- Create time_blocks table for blocking out availability
CREATE TABLE IF NOT EXISTS public.time_blocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    scope TEXT NOT NULL CHECK (scope IN ('global_for_host', 'event_only')),
    event_type_id UUID REFERENCES public.event_types(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    start_minutes INTEGER NOT NULL CHECK (start_minutes >= 0 AND start_minutes < 1440),
    end_minutes INTEGER NOT NULL CHECK (end_minutes > 0 AND end_minutes <= 1440),
    note TEXT,
    tz_at_create TEXT NOT NULL DEFAULT 'UTC',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT valid_time_range CHECK (end_minutes > start_minutes)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_time_blocks_owner_scope
    ON public.time_blocks(owner_user_id, scope);

CREATE INDEX IF NOT EXISTS idx_time_blocks_event_type
    ON public.time_blocks(event_type_id)
    WHERE event_type_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_time_blocks_date
    ON public.time_blocks(date);

-- Enable Row Level Security
ALTER TABLE public.time_blocks ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own time blocks"
    ON public.time_blocks
    FOR SELECT
    USING (owner_user_id = auth.uid());

CREATE POLICY "Users can insert their own time blocks"
    ON public.time_blocks
    FOR INSERT
    WITH CHECK (owner_user_id = auth.uid());

CREATE POLICY "Users can update their own time blocks"
    ON public.time_blocks
    FOR UPDATE
    USING (owner_user_id = auth.uid());

CREATE POLICY "Users can delete their own time blocks"
    ON public.time_blocks
    FOR DELETE
    USING (owner_user_id = auth.uid());

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_time_blocks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_time_blocks_updated_at
    BEFORE UPDATE ON public.time_blocks
    FOR EACH ROW
    EXECUTE FUNCTION update_time_blocks_updated_at();
