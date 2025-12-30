-- Add Whop-related columns to companies table
ALTER TABLE public.companies
ADD COLUMN IF NOT EXISTS whop_company_id TEXT UNIQUE;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_companies_whop_company_id ON public.companies(whop_company_id);

-- Create users table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    name TEXT,
    company_id TEXT REFERENCES public.companies(id) ON DELETE SET NULL,
    whop_user_id TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add index for Whop user ID lookups
CREATE INDEX IF NOT EXISTS idx_users_whop_user_id ON public.users(whop_user_id);
CREATE INDEX IF NOT EXISTS idx_users_company_id ON public.users(company_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);

-- Enable RLS on users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for users table
CREATE POLICY "Users can view their own data" ON public.users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own data" ON public.users
    FOR UPDATE USING (auth.uid() = id);

-- Allow service role to manage all users (for Edge Functions)
CREATE POLICY "Service role can manage all users" ON public.users
    FOR ALL USING (auth.jwt()->>'role' = 'service_role');
