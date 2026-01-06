-- Add booking_id column to call_logs table to link bookings with call logs
-- This migration is safe to run multiple times (uses IF NOT EXISTS)

-- Add booking_id if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                WHERE table_name = 'call_logs' AND column_name = 'booking_id') THEN
    ALTER TABLE public.call_logs
    ADD COLUMN booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_call_logs_booking_id ON public.call_logs(booking_id);

-- Add join_url if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                WHERE table_name = 'call_logs' AND column_name = 'join_url') THEN
    ALTER TABLE public.call_logs
    ADD COLUMN join_url TEXT;
  END IF;
END $$;

-- Add is_converted column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                WHERE table_name = 'call_logs' AND column_name = 'is_converted') THEN
    ALTER TABLE public.call_logs
    ADD COLUMN is_converted BOOLEAN DEFAULT false;
  END IF;
END $$;

-- Add conversion_amount column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                WHERE table_name = 'call_logs' AND column_name = 'conversion_amount') THEN
    ALTER TABLE public.call_logs
    ADD COLUMN conversion_amount DECIMAL(10, 2);
  END IF;
END $$;

-- Add metadata column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                WHERE table_name = 'call_logs' AND column_name = 'metadata') THEN
    ALTER TABLE public.call_logs
    ADD COLUMN metadata JSONB;
  END IF;
END $$;

-- Add status column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                WHERE table_name = 'call_logs' AND column_name = 'status') THEN
    ALTER TABLE public.call_logs ADD COLUMN status TEXT DEFAULT 'scheduled';
  END IF;
END $$;

-- Add call_time column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                WHERE table_name = 'call_logs' AND column_name = 'call_time') THEN
    ALTER TABLE public.call_logs
    ADD COLUMN call_time TEXT;
  END IF;
END $$;

-- Rename columns if needed (check if old names exist, rename to new names)
-- Rename caller_name to client_name
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
            WHERE table_name = 'call_logs' AND column_name = 'caller_name')
  AND NOT EXISTS (SELECT 1 FROM information_schema.columns
                  WHERE table_name = 'call_logs' AND column_name = 'client_name') THEN
    ALTER TABLE public.call_logs RENAME COLUMN caller_name TO client_name;
  END IF;
END $$;

-- Rename caller_email to client_email
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
            WHERE table_name = 'call_logs' AND column_name = 'caller_email')
  AND NOT EXISTS (SELECT 1 FROM information_schema.columns
                  WHERE table_name = 'call_logs' AND column_name = 'client_email') THEN
    ALTER TABLE public.call_logs RENAME COLUMN caller_email TO client_email;
  END IF;
END $$;

-- Rename caller_phone to client_phone
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
            WHERE table_name = 'call_logs' AND column_name = 'caller_phone')
  AND NOT EXISTS (SELECT 1 FROM information_schema.columns
                  WHERE table_name = 'call_logs' AND column_name = 'client_phone') THEN
    ALTER TABLE public.call_logs RENAME COLUMN caller_phone TO client_phone;
  END IF;
END $$;

-- Rename outcome to notes if outcome exists and notes doesn't
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
            WHERE table_name = 'call_logs' AND column_name = 'outcome')
  AND NOT EXISTS (SELECT 1 FROM information_schema.columns
                  WHERE table_name = 'call_logs' AND column_name = 'notes') THEN
    ALTER TABLE public.call_logs RENAME COLUMN outcome TO notes;
  END IF;
END $$;
