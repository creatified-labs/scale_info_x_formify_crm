-- Enable UUID extension (pgcrypto provides gen_random_uuid)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create companies table (must be created before event_types since it's referenced)
CREATE TABLE IF NOT EXISTS public.companies (
    id TEXT PRIMARY KEY,
    name TEXT,
    plan_id TEXT DEFAULT 'pro',
    branding_name TEXT,
    branding_display_name TEXT,
    branding_hide_badge BOOLEAN DEFAULT false,
    booking_slug_prefix TEXT,
    primary_contact_email TEXT,
    whop_user_id TEXT,
    whop_profile_picture TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    timezone TEXT DEFAULT 'America/New_York',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create event_types table
CREATE TABLE IF NOT EXISTS public.event_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    description TEXT,
    duration_minutes INTEGER NOT NULL DEFAULT 30,
    location_type TEXT NOT NULL DEFAULT 'video',
    location_details JSONB,
    inperson_location TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_archived BOOLEAN NOT NULL DEFAULT false,
    is_secret BOOLEAN DEFAULT false,
    color TEXT,
    buffer_before INTEGER,
    buffer_after INTEGER,
    min_notice_hours INTEGER,
    max_bookings_per_day INTEGER,
    capacity INTEGER,
    time_increment INTEGER,
    timezone_mode TEXT,
    theme_mode TEXT,
    use_custom_availability BOOLEAN,
    form_fields JSONB,
    invitee_form_schema JSONB,
    notifications JSONB,
    templates JSONB,
    allowed_call_types TEXT[],
    default_call_type TEXT,
    phone_required_for_phone_type BOOLEAN,
    success_message TEXT,
    redirect_url TEXT,
    redirect_button_text TEXT,
    custom_link_url TEXT,
    custom_link_label TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create availability_rules table
CREATE TABLE IF NOT EXISTS public.availability_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    weekday INTEGER NOT NULL CHECK (weekday >= 0 AND weekday <= 6),
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    timezone TEXT NOT NULL DEFAULT 'America/New_York',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create availability_overrides table
CREATE TABLE IF NOT EXISTS public.availability_overrides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    event_type_id UUID REFERENCES public.event_types(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    is_available BOOLEAN NOT NULL,
    start_time TEXT,
    end_time TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create event_availability_rules table
CREATE TABLE IF NOT EXISTS public.event_availability_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type_id UUID NOT NULL REFERENCES public.event_types(id) ON DELETE CASCADE,
    weekday INTEGER NOT NULL CHECK (weekday >= 0 AND weekday <= 6),
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create bookings table
CREATE TABLE IF NOT EXISTS public.bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type_id UUID NOT NULL REFERENCES public.event_types(id) ON DELETE CASCADE,
    host_user_id UUID NOT NULL,
    invitee_name TEXT NOT NULL,
    invitee_email TEXT NOT NULL,
    invitee_phone TEXT,
    invitee_timezone TEXT NOT NULL,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL DEFAULT 'confirmed',
    location_text TEXT,
    video_join_url TEXT,
    video_passcode TEXT,
    calendar_event_id TEXT,
    answers JSONB,
    notes TEXT,
    chosen_call_type TEXT,
    is_converted BOOLEAN DEFAULT false,
    conversion_amount NUMERIC,
    converted_at TIMESTAMPTZ,
    canceled_at TIMESTAMPTZ,
    canceled_reason TEXT,
    cancel_token TEXT,
    reschedule_token TEXT,
    provider_pending BOOLEAN,
    notification_log JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create calls table
CREATE TABLE IF NOT EXISTS public.calls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL,
    client_name TEXT NOT NULL,
    client_email TEXT,
    client_phone TEXT,
    start_utc TIMESTAMPTZ NOT NULL,
    end_utc TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL DEFAULT 'scheduled',
    source TEXT NOT NULL,
    channel TEXT,
    notes TEXT,
    converted BOOLEAN DEFAULT false,
    converted_at TIMESTAMPTZ,
    conversion_amount NUMERIC NOT NULL DEFAULT 0,
    conversion_currency TEXT NOT NULL DEFAULT 'USD',
    assignee_user_id UUID,
    event_type_id UUID REFERENCES public.event_types(id) ON DELETE SET NULL,
    utm JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create call_audits table
CREATE TABLE IF NOT EXISTS public.call_audits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    call_id UUID NOT NULL REFERENCES public.calls(id) ON DELETE CASCADE,
    actor_user_id UUID,
    change_source TEXT NOT NULL,
    before JSONB,
    after JSONB NOT NULL,
    occurred_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create forms table
CREATE TABLE IF NOT EXISTS public.forms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    description TEXT,
    form_type TEXT NOT NULL DEFAULT 'lead_capture',
    is_active BOOLEAN NOT NULL DEFAULT true,
    enable_scheduling BOOLEAN NOT NULL DEFAULT false,
    schedule_duration INTEGER,
    schedule_buffer INTEGER,
    available_days TEXT[],
    available_hours JSONB,
    deposit_required BOOLEAN NOT NULL DEFAULT false,
    deposit_amount NUMERIC,
    checkout_url TEXT,
    auto_qualify BOOLEAN NOT NULL DEFAULT false,
    qualification_rules JSONB,
    routing_rules JSONB,
    follow_up_enabled BOOLEAN NOT NULL DEFAULT false,
    follow_up_config JSONB,
    branding JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create form_fields table
CREATE TABLE IF NOT EXISTS public.form_fields (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    form_id UUID NOT NULL REFERENCES public.forms(id) ON DELETE CASCADE,
    label TEXT NOT NULL,
    field_type TEXT NOT NULL,
    placeholder TEXT,
    required BOOLEAN NOT NULL DEFAULT false,
    options JSONB,
    order_index INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create form_submissions table
CREATE TABLE IF NOT EXISTS public.form_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    form_id UUID NOT NULL REFERENCES public.forms(id) ON DELETE CASCADE,
    submission_data JSONB NOT NULL,
    status TEXT NOT NULL DEFAULT 'new',
    converted BOOLEAN NOT NULL DEFAULT false,
    assigned_to UUID,
    lead_score INTEGER,
    qualification_status TEXT,
    notes TEXT,
    scheduled_call_date DATE,
    scheduled_call_time TEXT,
    follow_up_date DATE,
    last_contact_date DATE,
    submitted_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create time_blocks table
CREATE TABLE IF NOT EXISTS public.time_blocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_user_id UUID NOT NULL,
    event_type_id UUID REFERENCES public.event_types(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    start_minutes INTEGER NOT NULL,
    end_minutes INTEGER NOT NULL,
    scope TEXT NOT NULL,
    note TEXT,
    repeat_rule JSONB,
    tz_at_create TEXT NOT NULL DEFAULT 'America/New_York',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create integration_accounts table
CREATE TABLE IF NOT EXISTS public.integration_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    provider TEXT NOT NULL,
    access_token TEXT,
    refresh_token TEXT,
    expires_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create webhooks table
CREATE TABLE IF NOT EXISTS public.webhooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    url TEXT NOT NULL,
    secret TEXT NOT NULL,
    events TEXT[] NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create subscriptions table
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    plan_tier TEXT NOT NULL DEFAULT 'free',
    status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create event_type_analytics table
CREATE TABLE IF NOT EXISTS public.event_type_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type_id UUID NOT NULL UNIQUE REFERENCES public.event_types(id) ON DELETE CASCADE,
    view_count INTEGER NOT NULL DEFAULT 0,
    submission_count INTEGER NOT NULL DEFAULT 0,
    last_viewed_at TIMESTAMPTZ,
    last_submitted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create tenant_daily_call_stats table
CREATE TABLE IF NOT EXISTS public.tenant_daily_call_stats (
    tenant_id TEXT NOT NULL,
    date DATE NOT NULL,
    booked INTEGER NOT NULL DEFAULT 0,
    completed INTEGER NOT NULL DEFAULT 0,
    cancelled INTEGER NOT NULL DEFAULT 0,
    no_show INTEGER NOT NULL DEFAULT 0,
    converted INTEGER NOT NULL DEFAULT 0,
    revenue_amount NUMERIC NOT NULL DEFAULT 0,
    revenue_currency TEXT NOT NULL DEFAULT 'USD',
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (tenant_id, date)
);

-- Create tenant_totals table
CREATE TABLE IF NOT EXISTS public.tenant_totals (
    tenant_id TEXT PRIMARY KEY,
    calls_booked_total INTEGER NOT NULL DEFAULT 0,
    completed_total INTEGER NOT NULL DEFAULT 0,
    cancelled_total INTEGER NOT NULL DEFAULT 0,
    no_show_total INTEGER NOT NULL DEFAULT 0,
    converted_total INTEGER NOT NULL DEFAULT 0,
    revenue_total NUMERIC NOT NULL DEFAULT 0,
    revenue_currency TEXT NOT NULL DEFAULT 'USD',
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create outbox_events table
CREATE TABLE IF NOT EXISTS public.outbox_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL,
    event_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    payload JSONB NOT NULL,
    processed_at TIMESTAMPTZ,
    retry_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_event_types_user_id ON public.event_types(user_id);
CREATE INDEX IF NOT EXISTS idx_event_types_slug ON public.event_types(slug);
CREATE INDEX IF NOT EXISTS idx_bookings_event_type_id ON public.bookings(event_type_id);
CREATE INDEX IF NOT EXISTS idx_bookings_host_user_id ON public.bookings(host_user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_start_time ON public.bookings(start_time);
CREATE INDEX IF NOT EXISTS idx_calls_tenant_id ON public.calls(tenant_id);
CREATE INDEX IF NOT EXISTS idx_calls_start_utc ON public.calls(start_utc);
CREATE INDEX IF NOT EXISTS idx_forms_user_id ON public.forms(user_id);
CREATE INDEX IF NOT EXISTS idx_forms_slug ON public.forms(slug);
CREATE INDEX IF NOT EXISTS idx_form_submissions_form_id ON public.form_submissions(form_id);

-- Enable Row Level Security
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_submissions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (basic policies - adjust as needed)
CREATE POLICY "Users can view their own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can view their own event types" ON public.event_types
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own event types" ON public.event_types
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own event types" ON public.event_types
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own event types" ON public.event_types
    FOR DELETE USING (auth.uid() = user_id);

-- Create functions
CREATE OR REPLACE FUNCTION public.increment_event_type_view(event_type_id_param UUID)
RETURNS VOID AS $$
BEGIN
    INSERT INTO public.event_type_analytics (event_type_id, view_count, last_viewed_at)
    VALUES (event_type_id_param, 1, NOW())
    ON CONFLICT (event_type_id) DO UPDATE
    SET view_count = event_type_analytics.view_count + 1,
        last_viewed_at = NOW();
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.increment_event_type_submission(event_type_id_param UUID)
RETURNS VOID AS $$
BEGIN
    INSERT INTO public.event_type_analytics (event_type_id, submission_count, last_submitted_at)
    VALUES (event_type_id_param, 1, NOW())
    ON CONFLICT (event_type_id) DO UPDATE
    SET submission_count = event_type_analytics.submission_count + 1,
        last_submitted_at = NOW();
END;
$$ LANGUAGE plpgsql;
