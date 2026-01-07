-- Migration: Add availability_schedules table and foreign keys
-- This is the first migration to introduce Cal.com-style named availability schedules
-- Part 1 of 3: Schema changes (table creation and column additions)

-- Create the availability_schedules table
-- This table stores named availability schedules like "Working Hours", "Weekend Hours", etc.
CREATE TABLE IF NOT EXISTS public.availability_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    is_default BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_user_schedule_name UNIQUE (user_id, name)
);

-- Add schedule_id to availability_rules (nullable initially for migration)
-- This will replace user_id as the primary grouping mechanism
ALTER TABLE public.availability_rules
    ADD COLUMN IF NOT EXISTS schedule_id UUID REFERENCES public.availability_schedules(id) ON DELETE CASCADE;

-- Add schedule_id to availability_overrides (nullable initially for migration)
-- Makes date blocks schedule-specific instead of user-specific
ALTER TABLE public.availability_overrides
    ADD COLUMN IF NOT EXISTS schedule_id UUID REFERENCES public.availability_schedules(id) ON DELETE CASCADE;

-- Add availability_schedule_id to event_types
-- NULL means use the user's default schedule
ALTER TABLE public.event_types
    ADD COLUMN IF NOT EXISTS availability_schedule_id UUID REFERENCES public.availability_schedules(id) ON DELETE SET NULL;

-- Performance indexes
-- Fast lookup of default schedule for a user
CREATE INDEX IF NOT EXISTS idx_availability_schedules_user_default
    ON public.availability_schedules(user_id, is_default)
    WHERE is_default = true;

-- Ensure only one default schedule per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_default_per_user
    ON public.availability_schedules(user_id)
    WHERE is_default = true;

-- Fast lookup of events by schedule
CREATE INDEX IF NOT EXISTS idx_event_types_schedule
    ON public.event_types(availability_schedule_id)
    WHERE availability_schedule_id IS NOT NULL;

-- Comments for documentation
COMMENT ON TABLE public.availability_schedules IS 'Named availability schedules (e.g., "Working Hours", "Weekend Hours") that can be assigned to event types';
COMMENT ON COLUMN public.availability_rules.schedule_id IS 'References the schedule this rule belongs to (replaces user_id as primary grouping)';
COMMENT ON COLUMN public.availability_overrides.schedule_id IS 'References the schedule this override belongs to (makes date blocks schedule-specific)';
COMMENT ON COLUMN public.event_types.availability_schedule_id IS 'Schedule to use for this event type. NULL = use user default schedule';
COMMENT ON COLUMN public.availability_schedules.is_default IS 'Only one schedule per user can be marked as default. New event types use the default schedule.';
