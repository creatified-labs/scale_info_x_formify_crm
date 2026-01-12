-- Add timezone support to availability schedules
-- This allows each schedule to have its own timezone (e.g., London schedule vs San Francisco schedule)

-- Add timezone column to availability_schedules
ALTER TABLE availability_schedules
ADD COLUMN timezone TEXT DEFAULT 'UTC';

-- Add comment explaining the column
COMMENT ON COLUMN availability_schedules.timezone IS 'Timezone for this availability schedule. All rules in this schedule are interpreted in this timezone. Defaults to UTC if not specified.';

-- Backfill existing schedules with user's timezone from profiles
-- This maintains backwards compatibility
UPDATE availability_schedules as
SET timezone = COALESCE(
  (SELECT timezone FROM profiles WHERE profiles.id = as.user_id),
  'UTC'
);

-- Set timezone to NOT NULL now that we've backfilled
ALTER TABLE availability_schedules
ALTER COLUMN timezone SET NOT NULL;
