-- Add currency tracking to bookings and call_logs
-- This ensures we store and display amounts in their original currency

-- =============================================================================
-- PART 1: Add currency columns
-- =============================================================================

-- Add conversion_currency column to bookings table
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS conversion_currency TEXT DEFAULT 'GBP';

COMMENT ON COLUMN bookings.conversion_currency IS
'Currency of the conversion amount (e.g., USD, GBP, EUR). Defaults to GBP for backward compatibility.';

-- Add conversion_currency column to call_logs table
ALTER TABLE call_logs
ADD COLUMN IF NOT EXISTS conversion_currency TEXT DEFAULT 'GBP';

COMMENT ON COLUMN call_logs.conversion_currency IS
'Currency of the conversion amount synced from bookings. Defaults to GBP for backward compatibility.';

-- =============================================================================
-- PART 2: Update sync function to include currency
-- =============================================================================

-- Update the sync_booking_to_call_log function to include conversion_currency
CREATE OR REPLACE FUNCTION sync_booking_to_call_log()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_company_id TEXT;
  v_duration_minutes INTEGER;
  v_call_status TEXT;
BEGIN
  -- Get company_id (either from booking or from event_type)
  v_company_id := COALESCE(
    NEW.company_id,
    (SELECT company_id FROM public.event_types WHERE id = NEW.event_type_id)
  );

  -- Skip if no company_id found
  IF v_company_id IS NULL THEN
    RAISE WARNING 'No company_id found for booking %, skipping call_log sync', NEW.id;
    RETURN NEW;
  END IF;

  -- Calculate duration in minutes
  v_duration_minutes := EXTRACT(EPOCH FROM (NEW.end_time - NEW.start_time)) / 60;

  -- Map booking status to call_log status
  v_call_status := CASE
    WHEN NEW.status IN ('confirmed', 'rescheduled') THEN 'scheduled'
    WHEN NEW.status = 'completed' THEN 'completed'
    WHEN NEW.status = 'canceled' THEN 'cancelled'
    WHEN NEW.status = 'no_show' THEN 'no-show'
    ELSE 'scheduled'
  END;

  -- Handle INSERT: Create new call_log
  IF (TG_OP = 'INSERT') THEN
    INSERT INTO public.call_logs (
      id,
      company_id,
      client_name,
      client_email,
      client_phone,
      call_type,
      call_date,
      call_time,
      duration_minutes,
      status,
      is_converted,
      conversion_amount,
      conversion_currency,  -- NEW: Include currency
      join_url,
      notes,
      booking_id,
      metadata,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      v_company_id,
      NEW.invitee_name,
      NEW.invitee_email,
      NEW.invitee_phone,
      COALESCE(NEW.chosen_call_type, 'meeting'),
      NEW.start_time,
      TO_CHAR(NEW.start_time, 'HH24:MI'),
      v_duration_minutes,
      v_call_status,
      COALESCE(NEW.is_converted, false),
      NEW.conversion_amount,
      COALESCE(NEW.conversion_currency, 'GBP'),  -- NEW: Sync currency
      NEW.video_join_url,
      NEW.notes,
      NEW.id,
      jsonb_build_object(
        'source', 'booking',
        'event_type_id', NEW.event_type_id
      ),
      NEW.created_at,
      NOW()
    )
    ON CONFLICT (booking_id)
    WHERE booking_id IS NOT NULL
    DO UPDATE SET
      client_name = EXCLUDED.client_name,
      client_email = EXCLUDED.client_email,
      client_phone = EXCLUDED.client_phone,
      call_type = EXCLUDED.call_type,
      call_date = EXCLUDED.call_date,
      call_time = EXCLUDED.call_time,
      duration_minutes = EXCLUDED.duration_minutes,
      status = EXCLUDED.status,
      is_converted = EXCLUDED.is_converted,
      conversion_amount = EXCLUDED.conversion_amount,
      conversion_currency = EXCLUDED.conversion_currency,  -- NEW: Update currency
      join_url = EXCLUDED.join_url,
      notes = EXCLUDED.notes,
      updated_at = NOW();

    RETURN NEW;
  END IF;

  -- Handle UPDATE: Update existing call_log
  IF (TG_OP = 'UPDATE') THEN
    UPDATE public.call_logs
    SET
      client_name = NEW.invitee_name,
      client_email = NEW.invitee_email,
      client_phone = NEW.invitee_phone,
      call_type = COALESCE(NEW.chosen_call_type, 'meeting'),
      call_date = NEW.start_time,
      call_time = TO_CHAR(NEW.start_time, 'HH24:MI'),
      duration_minutes = v_duration_minutes,
      status = v_call_status,
      is_converted = COALESCE(NEW.is_converted, false),
      conversion_amount = NEW.conversion_amount,
      conversion_currency = COALESCE(NEW.conversion_currency, 'GBP'),  -- NEW: Sync currency
      join_url = NEW.video_join_url,
      notes = NEW.notes,
      metadata = jsonb_build_object(
        'source', 'booking',
        'event_type_id', NEW.event_type_id
      ),
      updated_at = NOW()
    WHERE booking_id = NEW.id;

    -- If no rows updated, it means the call_log was manually deleted, so recreate it
    IF NOT FOUND THEN
      INSERT INTO public.call_logs (
        id,
        company_id,
        client_name,
        client_email,
        client_phone,
        call_type,
        call_date,
        call_time,
        duration_minutes,
        status,
        is_converted,
        conversion_amount,
        conversion_currency,  -- NEW: Include currency
        join_url,
        notes,
        booking_id,
        metadata,
        created_at,
        updated_at
      ) VALUES (
        gen_random_uuid(),
        v_company_id,
        NEW.invitee_name,
        NEW.invitee_email,
        NEW.invitee_phone,
        COALESCE(NEW.chosen_call_type, 'meeting'),
        NEW.start_time,
        TO_CHAR(NEW.start_time, 'HH24:MI'),
        v_duration_minutes,
        v_call_status,
        COALESCE(NEW.is_converted, false),
        NEW.conversion_amount,
        COALESCE(NEW.conversion_currency, 'GBP'),  -- NEW: Sync currency
        NEW.video_join_url,
        NEW.notes,
        NEW.id,
        jsonb_build_object(
          'source', 'booking',
          'event_type_id', NEW.event_type_id
        ),
        NEW.created_at,
        NOW()
      );
    END IF;

    RETURN NEW;
  END IF;

  -- Handle DELETE: Remove corresponding call_log
  IF (TG_OP = 'DELETE') THEN
    DELETE FROM public.call_logs WHERE booking_id = OLD.id;
    RETURN OLD;
  END IF;

  RETURN NEW;
END;
$$;

-- =============================================================================
-- SUMMARY
-- =============================================================================

-- This migration:
-- 1. ✅ Adds conversion_currency column to bookings table
-- 2. ✅ Adds conversion_currency column to call_logs table
-- 3. ✅ Updates sync_booking_to_call_log() function to sync currency
-- 4. ✅ Defaults to 'GBP' for backward compatibility with existing data

-- Future conversions will store their original currency
-- Existing conversions will show as GBP (their likely original currency)
