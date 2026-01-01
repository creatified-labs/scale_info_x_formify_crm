-- Add policies to allow service role to manage companies and profiles
-- Service role operations bypass RLS by default, but we need INSERT policies for companies

-- Drop existing restrictive policies if they exist
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own event types" ON public.event_types;
DROP POLICY IF EXISTS "Users can create their own event types" ON public.event_types;
DROP POLICY IF EXISTS "Users can update their own event types" ON public.event_types;
DROP POLICY IF EXISTS "Users can delete their own event types" ON public.event_types;

-- Profiles policies
CREATE POLICY "Users can view their own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Service can insert profiles" ON public.profiles
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Service can update profiles" ON public.profiles
    FOR UPDATE USING (true);

-- Event types policies
CREATE POLICY "Users can view their own event types" ON public.event_types
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service can create event types" ON public.event_types
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their own event types" ON public.event_types
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Service can update event types" ON public.event_types
    FOR UPDATE USING (true);

CREATE POLICY "Users can delete their own event types" ON public.event_types
    FOR DELETE USING (auth.uid() = user_id);

-- Companies policies (if not already exist)
DROP POLICY IF EXISTS "Anyone can view companies" ON public.companies;
DROP POLICY IF EXISTS "Service can insert companies" ON public.companies;
DROP POLICY IF EXISTS "Service can update companies" ON public.companies;

CREATE POLICY "Anyone can view companies" ON public.companies
    FOR SELECT USING (true);

CREATE POLICY "Service can insert companies" ON public.companies
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Service can update companies" ON public.companies
    FOR UPDATE USING (true);
