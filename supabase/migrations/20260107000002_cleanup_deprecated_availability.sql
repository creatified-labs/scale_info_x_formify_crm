-- Migration: Cleanup deprecated availability tables and add RLS policies
-- This is the third migration to introduce Cal.com-style named availability schedules
-- Part 3 of 3: Cleanup (remove deprecated tables/columns and add security policies)

-- Drop event_availability_rules table (migrated to availability_rules with schedule_id)
DROP TABLE IF EXISTS public.event_availability_rules;

-- Remove use_custom_availability column from event_types (replaced by availability_schedule_id)
ALTER TABLE public.event_types
    DROP COLUMN IF EXISTS use_custom_availability;

-- Remove event_type_id from availability_overrides (now schedule-specific, not event-specific)
ALTER TABLE public.availability_overrides
    DROP COLUMN IF EXISTS event_type_id;

-- Enable RLS on availability_schedules table
ALTER TABLE public.availability_schedules ENABLE ROW LEVEL SECURITY;

-- RLS Policies for availability_schedules
DROP POLICY IF EXISTS "Users can view their own schedules" ON public.availability_schedules;
CREATE POLICY "Users can view their own schedules"
    ON public.availability_schedules
    FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own schedules" ON public.availability_schedules;
CREATE POLICY "Users can create their own schedules"
    ON public.availability_schedules
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own schedules" ON public.availability_schedules;
CREATE POLICY "Users can update their own schedules"
    ON public.availability_schedules
    FOR UPDATE
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own schedules" ON public.availability_schedules;
CREATE POLICY "Users can delete their own schedules"
    ON public.availability_schedules
    FOR DELETE
    USING (auth.uid() = user_id);

-- Update RLS policies for availability_rules to use schedule ownership
DROP POLICY IF EXISTS "Users can view their own availability rules" ON public.availability_rules;
DROP POLICY IF EXISTS "Users can view their schedule availability rules" ON public.availability_rules;
CREATE POLICY "Users can view their schedule availability rules"
    ON public.availability_rules
    FOR SELECT
    USING (
        schedule_id IN (
            SELECT id FROM public.availability_schedules
            WHERE user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can insert their own availability rules" ON public.availability_rules;
DROP POLICY IF EXISTS "Users can insert into their schedule rules" ON public.availability_rules;
CREATE POLICY "Users can insert into their schedule rules"
    ON public.availability_rules
    FOR INSERT
    WITH CHECK (
        schedule_id IN (
            SELECT id FROM public.availability_schedules
            WHERE user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can update their own availability rules" ON public.availability_rules;
DROP POLICY IF EXISTS "Users can update their schedule rules" ON public.availability_rules;
CREATE POLICY "Users can update their schedule rules"
    ON public.availability_rules
    FOR UPDATE
    USING (
        schedule_id IN (
            SELECT id FROM public.availability_schedules
            WHERE user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can delete their own availability rules" ON public.availability_rules;
DROP POLICY IF EXISTS "Users can delete their schedule rules" ON public.availability_rules;
CREATE POLICY "Users can delete their schedule rules"
    ON public.availability_rules
    FOR DELETE
    USING (
        schedule_id IN (
            SELECT id FROM public.availability_schedules
            WHERE user_id = auth.uid()
        )
    );

-- Update RLS policies for availability_overrides to use schedule ownership
DROP POLICY IF EXISTS "Users can view their own overrides" ON public.availability_overrides;
DROP POLICY IF EXISTS "Users can view their schedule overrides" ON public.availability_overrides;
CREATE POLICY "Users can view their schedule overrides"
    ON public.availability_overrides
    FOR SELECT
    USING (
        schedule_id IN (
            SELECT id FROM public.availability_schedules
            WHERE user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can insert their own overrides" ON public.availability_overrides;
DROP POLICY IF EXISTS "Users can insert into their schedule overrides" ON public.availability_overrides;
CREATE POLICY "Users can insert into their schedule overrides"
    ON public.availability_overrides
    FOR INSERT
    WITH CHECK (
        schedule_id IN (
            SELECT id FROM public.availability_schedules
            WHERE user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can update their own overrides" ON public.availability_overrides;
DROP POLICY IF EXISTS "Users can update their schedule overrides" ON public.availability_overrides;
CREATE POLICY "Users can update their schedule overrides"
    ON public.availability_overrides
    FOR UPDATE
    USING (
        schedule_id IN (
            SELECT id FROM public.availability_schedules
            WHERE user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can delete their own overrides" ON public.availability_overrides;
DROP POLICY IF EXISTS "Users can delete their schedule overrides" ON public.availability_overrides;
CREATE POLICY "Users can delete their schedule overrides"
    ON public.availability_overrides
    FOR DELETE
    USING (
        schedule_id IN (
            SELECT id FROM public.availability_schedules
            WHERE user_id = auth.uid()
        )
    );

-- Grant necessary permissions to service role (for Edge Functions)
GRANT ALL ON public.availability_schedules TO service_role;
GRANT ALL ON public.availability_rules TO service_role;
GRANT ALL ON public.availability_overrides TO service_role;

-- Grant necessary permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON public.availability_schedules TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.availability_rules TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.availability_overrides TO authenticated;

-- Final summary
DO $$
BEGIN
    RAISE NOTICE '=== Cleanup Complete ===';
    RAISE NOTICE 'Dropped: event_availability_rules table';
    RAISE NOTICE 'Dropped: event_types.use_custom_availability column';
    RAISE NOTICE 'Dropped: availability_overrides.event_type_id column';
    RAISE NOTICE 'Added: RLS policies for schedule-based access control';
    RAISE NOTICE 'Migration to availability schedules system complete!';
END $$;
