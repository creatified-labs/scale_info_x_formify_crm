-- Add additional calendar tracking columns to bookings table
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS meet_link TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS calendar_synced_at TIMESTAMPTZ;

-- Create email_templates table
CREATE TABLE IF NOT EXISTS public.email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id TEXT NOT NULL,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create email_logs table for tracking sent emails
CREATE TABLE IF NOT EXISTS public.email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE,
  template_id UUID REFERENCES public.email_templates(id) ON DELETE SET NULL,
  recipient_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'sent',
  message_id TEXT,
  error_message TEXT,
  company_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create email_reminders table for scheduled reminder emails
CREATE TABLE IF NOT EXISTS public.email_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  reminder_type TEXT NOT NULL,
  scheduled_for TIMESTAMPTZ NOT NULL,
  sent BOOLEAN DEFAULT FALSE,
  sent_at TIMESTAMPTZ,
  company_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_email_logs_booking_id ON public.email_logs(booking_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_company_id ON public.email_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_email_reminders_booking_id ON public.email_reminders(booking_id);
CREATE INDEX IF NOT EXISTS idx_email_reminders_scheduled_for ON public.email_reminders(scheduled_for) WHERE sent = FALSE;
CREATE INDEX IF NOT EXISTS idx_email_templates_company_id ON public.email_templates(company_id);
CREATE INDEX IF NOT EXISTS idx_bookings_calendar_event_id ON public.bookings(calendar_event_id) WHERE calendar_event_id IS NOT NULL;

-- Add settings column to companies table if it doesn't exist
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}'::jsonb;
