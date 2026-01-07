-- Migration: Migrate existing availability data to schedule system
-- This is the second migration to introduce Cal.com-style named availability schedules
-- Part 2 of 3: Data migration (convert existing data to new structure)

-- Step 1: Create a "Default" schedule for each user who has availability_rules
DO $$
DECLARE
    user_record RECORD;
    default_schedule_id UUID;
BEGIN
    -- For each user with existing availability rules
    FOR user_record IN
        SELECT DISTINCT user_id
        FROM public.availability_rules
        WHERE user_id IS NOT NULL
    LOOP
        -- Create "Default" schedule for this user
        INSERT INTO public.availability_schedules (user_id, name, is_default)
        VALUES (user_record.user_id, 'Default', true)
        RETURNING id INTO default_schedule_id;

        -- Migrate all availability_rules for this user to reference the new schedule
        UPDATE public.availability_rules
        SET schedule_id = default_schedule_id
        WHERE user_id = user_record.user_id
          AND schedule_id IS NULL;

        -- Migrate global availability_overrides (where event_type_id is NULL)
        UPDATE public.availability_overrides
        SET schedule_id = default_schedule_id
        WHERE user_id = user_record.user_id
          AND event_type_id IS NULL
          AND schedule_id IS NULL;

        RAISE NOTICE 'Created Default schedule for user %', user_record.user_id;
    END LOOP;
END $$;

-- Step 2: For events with custom availability, create named schedules
DO $$
DECLARE
    event_record RECORD;
    custom_schedule_id UUID;
    schedule_name TEXT;
    default_schedule_id UUID;
    user_timezone TEXT;
BEGIN
    -- For each event type with use_custom_availability = true
    FOR event_record IN
        SELECT et.id, et.user_id, et.name, et.use_custom_availability
        FROM public.event_types et
        WHERE et.use_custom_availability = true
    LOOP
        -- Get user's default schedule (or create one if missing)
        SELECT id INTO default_schedule_id
        FROM public.availability_schedules
        WHERE user_id = event_record.user_id AND is_default = true
        LIMIT 1;

        -- If no default schedule exists, create one
        IF default_schedule_id IS NULL THEN
            INSERT INTO public.availability_schedules (user_id, name, is_default)
            VALUES (event_record.user_id, 'Default', true)
            RETURNING id INTO default_schedule_id;
            RAISE NOTICE 'Created Default schedule for user % (via event migration)', event_record.user_id;
        END IF;

        -- Check if this event actually has custom rules in event_availability_rules
        IF EXISTS (
            SELECT 1 FROM public.event_availability_rules
            WHERE event_type_id = event_record.id
        ) THEN
            -- Create a named schedule for this event's custom hours
            schedule_name := event_record.name || ' Hours';

            -- Ensure schedule name is unique for this user
            IF EXISTS (
                SELECT 1 FROM public.availability_schedules
                WHERE user_id = event_record.user_id AND name = schedule_name
            ) THEN
                -- Append a number to make it unique
                schedule_name := schedule_name || ' ' || (
                    SELECT COALESCE(MAX(
                        NULLIF(regexp_replace(name, '^' || event_record.name || ' Hours (\\d+)$', '\\1'), '')::integer
                    ), 0) + 1
                    FROM public.availability_schedules
                    WHERE user_id = event_record.user_id
                      AND name LIKE event_record.name || ' Hours%'
                );
            END IF;

            -- Create the custom schedule
            INSERT INTO public.availability_schedules (user_id, name, is_default)
            VALUES (event_record.user_id, schedule_name, false)
            RETURNING id INTO custom_schedule_id;

            -- Get user timezone from profiles (fallback to America/New_York)
            SELECT COALESCE(p.timezone, 'America/New_York') INTO user_timezone
            FROM public.profiles p
            WHERE p.id = event_record.user_id;

            -- Convert event_availability_rules to regular availability_rules with schedule_id
            INSERT INTO public.availability_rules (schedule_id, user_id, weekday, start_time, end_time, timezone)
            SELECT
                custom_schedule_id,
                event_record.user_id,
                ear.weekday,
                ear.start_time,
                ear.end_time,
                user_timezone
            FROM public.event_availability_rules ear
            WHERE ear.event_type_id = event_record.id;

            -- Migrate event-specific availability_overrides to this schedule
            UPDATE public.availability_overrides
            SET schedule_id = custom_schedule_id
            WHERE event_type_id = event_record.id
              AND schedule_id IS NULL;

            -- Link event to its custom schedule
            UPDATE public.event_types
            SET availability_schedule_id = custom_schedule_id
            WHERE id = event_record.id;

            RAISE NOTICE 'Created custom schedule "%" for event "%"', schedule_name, event_record.name;
        ELSE
            -- No custom rules, just link to default schedule
            UPDATE public.event_types
            SET availability_schedule_id = default_schedule_id
            WHERE id = event_record.id;

            RAISE NOTICE 'Linked event "%" to Default schedule', event_record.name;
        END IF;
    END LOOP;
END $$;

-- Step 3: Make schedule_id NOT NULL on availability_rules (all should be migrated now)
-- First verify all rows have schedule_id
DO $$
DECLARE
    missing_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO missing_count
    FROM public.availability_rules
    WHERE schedule_id IS NULL;

    IF missing_count > 0 THEN
        RAISE WARNING '% availability_rules rows still have NULL schedule_id', missing_count;
    ELSE
        RAISE NOTICE 'All availability_rules have been migrated to schedules';
        -- Make column NOT NULL
        ALTER TABLE public.availability_rules
            ALTER COLUMN schedule_id SET NOT NULL;
    END IF;
END $$;

-- Step 4: Add indexes on schedule_id for fast lookups
CREATE INDEX IF NOT EXISTS idx_availability_rules_schedule
    ON public.availability_rules(schedule_id, weekday);

CREATE INDEX IF NOT EXISTS idx_availability_overrides_schedule
    ON public.availability_overrides(schedule_id, date);

-- Step 5: Keep user_id column for now but add index for backwards compatibility
-- We'll remove it in the cleanup migration after confirming everything works
CREATE INDEX IF NOT EXISTS idx_availability_rules_user_legacy
    ON public.availability_rules(user_id)
    WHERE schedule_id IS NOT NULL;

COMMENT ON COLUMN public.availability_rules.user_id IS 'DEPRECATED: Use schedule_id instead. Kept temporarily for backwards compatibility.';

-- Step 6: Summary report
DO $$
DECLARE
    schedule_count INTEGER;
    rule_count INTEGER;
    event_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO schedule_count FROM public.availability_schedules;
    SELECT COUNT(*) INTO rule_count FROM public.availability_rules WHERE schedule_id IS NOT NULL;
    SELECT COUNT(*) INTO event_count FROM public.event_types WHERE availability_schedule_id IS NOT NULL;

    RAISE NOTICE '=== Migration Summary ===';
    RAISE NOTICE 'Total schedules created: %', schedule_count;
    RAISE NOTICE 'Total rules migrated: %', rule_count;
    RAISE NOTICE 'Total events linked to schedules: %', event_count;
END $$;
