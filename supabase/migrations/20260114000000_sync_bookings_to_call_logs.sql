-- Migration: Sync bookings to call_logs and populate aggregated metrics tables
-- This ensures all booking data is automatically reflected in analytics

-- =============================================================================
-- PART 1: Sync bookings to call_logs
-- =============================================================================

-- Create function to sync a booking to call_logs
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

-- Create trigger to sync bookings to call_logs
DROP TRIGGER IF EXISTS trigger_sync_booking_to_call_log ON public.bookings;
CREATE TRIGGER trigger_sync_booking_to_call_log
  AFTER INSERT OR UPDATE OR DELETE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION sync_booking_to_call_log();

-- =============================================================================
-- PART 2: Update tenant_totals aggregated metrics
-- =============================================================================

-- Create function to update tenant_totals when call_logs change
CREATE OR REPLACE FUNCTION update_tenant_totals()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_company_id TEXT;
  v_calls_booked INTEGER;
  v_completed INTEGER;
  v_cancelled INTEGER;
  v_no_show INTEGER;
  v_converted INTEGER;
  v_revenue NUMERIC;
BEGIN
  -- Get company_id from NEW or OLD
  v_company_id := COALESCE(NEW.company_id, OLD.company_id);

  -- Calculate aggregated metrics for this company
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'completed'),
    COUNT(*) FILTER (WHERE status = 'cancelled'),
    COUNT(*) FILTER (WHERE status = 'no-show'),
    COUNT(*) FILTER (WHERE is_converted = true),
    COALESCE(SUM(conversion_amount) FILTER (WHERE is_converted = true), 0)
  INTO
    v_calls_booked,
    v_completed,
    v_cancelled,
    v_no_show,
    v_converted,
    v_revenue
  FROM public.call_logs
  WHERE company_id = v_company_id;

  -- Upsert into tenant_totals
  INSERT INTO public.tenant_totals (
    tenant_id,
    calls_booked_total,
    completed_total,
    cancelled_total,
    no_show_total,
    converted_total,
    revenue_total,
    revenue_currency,
    updated_at
  ) VALUES (
    v_company_id,
    v_calls_booked,
    v_completed,
    v_cancelled,
    v_no_show,
    v_converted,
    v_revenue,
    'GBP',
    NOW()
  )
  ON CONFLICT (tenant_id) DO UPDATE SET
    calls_booked_total = EXCLUDED.calls_booked_total,
    completed_total = EXCLUDED.completed_total,
    cancelled_total = EXCLUDED.cancelled_total,
    no_show_total = EXCLUDED.no_show_total,
    converted_total = EXCLUDED.converted_total,
    revenue_total = EXCLUDED.revenue_total,
    updated_at = NOW();

  IF (TG_OP = 'DELETE') THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

-- Create trigger to update tenant_totals
DROP TRIGGER IF EXISTS trigger_update_tenant_totals ON public.call_logs;
CREATE TRIGGER trigger_update_tenant_totals
  AFTER INSERT OR UPDATE OR DELETE ON public.call_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_tenant_totals();

-- =============================================================================
-- PART 3: Update tenant_daily_call_stats aggregated metrics
-- =============================================================================

-- Create function to update tenant_daily_call_stats when call_logs change
CREATE OR REPLACE FUNCTION update_tenant_daily_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_company_id TEXT;
  v_date DATE;
  v_old_date DATE;
BEGIN
  -- Handle INSERT and UPDATE
  IF (TG_OP IN ('INSERT', 'UPDATE')) THEN
    v_company_id := NEW.company_id;
    v_date := DATE(NEW.call_date);

    -- Update stats for the new date
    INSERT INTO public.tenant_daily_call_stats (
      tenant_id,
      date,
      booked,
      completed,
      cancelled,
      no_show,
      converted,
      revenue_amount,
      revenue_currency,
      updated_at
    )
    SELECT
      v_company_id,
      v_date,
      COUNT(*),
      COUNT(*) FILTER (WHERE status = 'completed'),
      COUNT(*) FILTER (WHERE status = 'cancelled'),
      COUNT(*) FILTER (WHERE status = 'no-show'),
      COUNT(*) FILTER (WHERE is_converted = true),
      COALESCE(SUM(conversion_amount) FILTER (WHERE is_converted = true), 0),
      'GBP',
      NOW()
    FROM public.call_logs
    WHERE company_id = v_company_id AND DATE(call_date) = v_date
    ON CONFLICT (tenant_id, date) DO UPDATE SET
      booked = EXCLUDED.booked,
      completed = EXCLUDED.completed,
      cancelled = EXCLUDED.cancelled,
      no_show = EXCLUDED.no_show,
      converted = EXCLUDED.converted,
      revenue_amount = EXCLUDED.revenue_amount,
      updated_at = NOW();
  END IF;

  -- Handle UPDATE where date changed - update old date stats
  IF (TG_OP = 'UPDATE' AND DATE(OLD.call_date) != DATE(NEW.call_date)) THEN
    v_old_date := DATE(OLD.call_date);

    INSERT INTO public.tenant_daily_call_stats (
      tenant_id,
      date,
      booked,
      completed,
      cancelled,
      no_show,
      converted,
      revenue_amount,
      revenue_currency,
      updated_at
    )
    SELECT
      OLD.company_id,
      v_old_date,
      COUNT(*),
      COUNT(*) FILTER (WHERE status = 'completed'),
      COUNT(*) FILTER (WHERE status = 'cancelled'),
      COUNT(*) FILTER (WHERE status = 'no-show'),
      COUNT(*) FILTER (WHERE is_converted = true),
      COALESCE(SUM(conversion_amount) FILTER (WHERE is_converted = true), 0),
      'GBP',
      NOW()
    FROM public.call_logs
    WHERE company_id = OLD.company_id AND DATE(call_date) = v_old_date
    ON CONFLICT (tenant_id, date) DO UPDATE SET
      booked = EXCLUDED.booked,
      completed = EXCLUDED.completed,
      cancelled = EXCLUDED.cancelled,
      no_show = EXCLUDED.no_show,
      converted = EXCLUDED.converted,
      revenue_amount = EXCLUDED.revenue_amount,
      updated_at = NOW();
  END IF;

  -- Handle DELETE
  IF (TG_OP = 'DELETE') THEN
    v_company_id := OLD.company_id;
    v_date := DATE(OLD.call_date);

    INSERT INTO public.tenant_daily_call_stats (
      tenant_id,
      date,
      booked,
      completed,
      cancelled,
      no_show,
      converted,
      revenue_amount,
      revenue_currency,
      updated_at
    )
    SELECT
      v_company_id,
      v_date,
      COUNT(*),
      COUNT(*) FILTER (WHERE status = 'completed'),
      COUNT(*) FILTER (WHERE status = 'cancelled'),
      COUNT(*) FILTER (WHERE status = 'no-show'),
      COUNT(*) FILTER (WHERE is_converted = true),
      COALESCE(SUM(conversion_amount) FILTER (WHERE is_converted = true), 0),
      'GBP',
      NOW()
    FROM public.call_logs
    WHERE company_id = v_company_id AND DATE(call_date) = v_date
    ON CONFLICT (tenant_id, date) DO UPDATE SET
      booked = EXCLUDED.booked,
      completed = EXCLUDED.completed,
      cancelled = EXCLUDED.cancelled,
      no_show = EXCLUDED.no_show,
      converted = EXCLUDED.converted,
      revenue_amount = EXCLUDED.revenue_amount,
      updated_at = NOW();

    RETURN OLD;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger to update tenant_daily_call_stats
DROP TRIGGER IF EXISTS trigger_update_tenant_daily_stats ON public.call_logs;
CREATE TRIGGER trigger_update_tenant_daily_stats
  AFTER INSERT OR UPDATE OR DELETE ON public.call_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_tenant_daily_stats();

-- =============================================================================
-- PART 4: Backfill existing bookings to call_logs
-- =============================================================================

-- First, ensure the booking_id column has a unique constraint for upserts
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'call_logs'
    AND indexname = 'idx_call_logs_booking_id_unique'
  ) THEN
    CREATE UNIQUE INDEX idx_call_logs_booking_id_unique
    ON public.call_logs(booking_id)
    WHERE booking_id IS NOT NULL;
  END IF;
END $$;

-- Backfill: Sync all existing bookings to call_logs
DO $$
DECLARE
  v_booking RECORD;
  v_company_id TEXT;
  v_duration_minutes INTEGER;
  v_call_status TEXT;
BEGIN
  RAISE NOTICE 'Starting backfill of existing bookings to call_logs...';

  FOR v_booking IN
    SELECT * FROM public.bookings
    ORDER BY created_at
  LOOP
    -- Get company_id
    v_company_id := COALESCE(
      v_booking.company_id,
      (SELECT company_id FROM public.event_types WHERE id = v_booking.event_type_id)
    );

    -- Skip if no company_id
    IF v_company_id IS NULL THEN
      RAISE WARNING 'No company_id found for booking %, skipping', v_booking.id;
      CONTINUE;
    END IF;

    -- Calculate duration
    v_duration_minutes := EXTRACT(EPOCH FROM (v_booking.end_time - v_booking.start_time)) / 60;

    -- Map status
    v_call_status := CASE
      WHEN v_booking.status IN ('confirmed', 'rescheduled') THEN 'scheduled'
      WHEN v_booking.status = 'completed' THEN 'completed'
      WHEN v_booking.status = 'canceled' THEN 'cancelled'
      WHEN v_booking.status = 'no_show' THEN 'no-show'
      ELSE 'scheduled'
    END;

    -- Insert or update call_log
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
      join_url,
      notes,
      booking_id,
      metadata,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      v_company_id,
      v_booking.invitee_name,
      v_booking.invitee_email,
      v_booking.invitee_phone,
      COALESCE(v_booking.chosen_call_type, 'meeting'),
      v_booking.start_time,
      TO_CHAR(v_booking.start_time, 'HH24:MI'),
      v_duration_minutes,
      v_call_status,
      COALESCE(v_booking.is_converted, false),
      v_booking.conversion_amount,
      v_booking.video_join_url,
      v_booking.notes,
      v_booking.id,
      jsonb_build_object(
        'source', 'booking',
        'event_type_id', v_booking.event_type_id,
        'backfilled', true
      ),
      v_booking.created_at,
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
      join_url = EXCLUDED.join_url,
      notes = EXCLUDED.notes,
      updated_at = NOW();
  END LOOP;

  RAISE NOTICE 'Backfill complete!';
END $$;

-- =============================================================================
-- PART 5: Backfill aggregated metrics tables
-- =============================================================================

-- Backfill tenant_totals
DO $$
DECLARE
  v_company RECORD;
BEGIN
  RAISE NOTICE 'Backfilling tenant_totals...';

  FOR v_company IN
    SELECT DISTINCT company_id FROM public.call_logs
  LOOP
    INSERT INTO public.tenant_totals (
      tenant_id,
      calls_booked_total,
      completed_total,
      cancelled_total,
      no_show_total,
      converted_total,
      revenue_total,
      revenue_currency,
      updated_at
    )
    SELECT
      v_company.company_id,
      COUNT(*),
      COUNT(*) FILTER (WHERE status = 'completed'),
      COUNT(*) FILTER (WHERE status = 'cancelled'),
      COUNT(*) FILTER (WHERE status = 'no-show'),
      COUNT(*) FILTER (WHERE is_converted = true),
      COALESCE(SUM(conversion_amount) FILTER (WHERE is_converted = true), 0),
      'GBP',
      NOW()
    FROM public.call_logs
    WHERE company_id = v_company.company_id
    ON CONFLICT (tenant_id) DO UPDATE SET
      calls_booked_total = EXCLUDED.calls_booked_total,
      completed_total = EXCLUDED.completed_total,
      cancelled_total = EXCLUDED.cancelled_total,
      no_show_total = EXCLUDED.no_show_total,
      converted_total = EXCLUDED.converted_total,
      revenue_total = EXCLUDED.revenue_total,
      updated_at = NOW();
  END LOOP;

  RAISE NOTICE 'tenant_totals backfill complete!';
END $$;

-- Backfill tenant_daily_call_stats
DO $$
DECLARE
  v_row RECORD;
BEGIN
  RAISE NOTICE 'Backfilling tenant_daily_call_stats...';

  FOR v_row IN
    SELECT DISTINCT company_id, DATE(call_date) as date
    FROM public.call_logs
    ORDER BY company_id, date
  LOOP
    INSERT INTO public.tenant_daily_call_stats (
      tenant_id,
      date,
      booked,
      completed,
      cancelled,
      no_show,
      converted,
      revenue_amount,
      revenue_currency,
      updated_at
    )
    SELECT
      v_row.company_id,
      v_row.date,
      COUNT(*),
      COUNT(*) FILTER (WHERE status = 'completed'),
      COUNT(*) FILTER (WHERE status = 'cancelled'),
      COUNT(*) FILTER (WHERE status = 'no-show'),
      COUNT(*) FILTER (WHERE is_converted = true),
      COALESCE(SUM(conversion_amount) FILTER (WHERE is_converted = true), 0),
      'GBP',
      NOW()
    FROM public.call_logs
    WHERE company_id = v_row.company_id AND DATE(call_date) = v_row.date
    ON CONFLICT (tenant_id, date) DO UPDATE SET
      booked = EXCLUDED.booked,
      completed = EXCLUDED.completed,
      cancelled = EXCLUDED.cancelled,
      no_show = EXCLUDED.no_show,
      converted = EXCLUDED.converted,
      revenue_amount = EXCLUDED.revenue_amount,
      updated_at = NOW();
  END LOOP;

  RAISE NOTICE 'tenant_daily_call_stats backfill complete!';
END $$;

-- =============================================================================
-- SUMMARY
-- =============================================================================

-- This migration:
-- 1. ✅ Creates sync_booking_to_call_log() function and trigger
-- 2. ✅ Creates update_tenant_totals() function and trigger
-- 3. ✅ Creates update_tenant_daily_stats() function and trigger
-- 4. ✅ Backfills existing bookings to call_logs
-- 5. ✅ Backfills tenant_totals and tenant_daily_call_stats

-- All bookings will now automatically sync to call_logs
-- All analytics tables will automatically update when call_logs change
