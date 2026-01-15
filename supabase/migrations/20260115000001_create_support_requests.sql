-- Migration: Create support_requests table
-- This table stores support requests from users

CREATE TABLE IF NOT EXISTS public.support_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'resolved')),
  resolved_at TIMESTAMPTZ,
  notes TEXT
);

-- Add index for faster lookups by email
CREATE INDEX IF NOT EXISTS idx_support_requests_email ON public.support_requests(email);

-- Add index for faster lookups by status
CREATE INDEX IF NOT EXISTS idx_support_requests_status ON public.support_requests(status);

-- Add index for sorting by created_at
CREATE INDEX IF NOT EXISTS idx_support_requests_created_at ON public.support_requests(created_at DESC);

-- Enable RLS
ALTER TABLE public.support_requests ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can insert support requests (no auth required)
CREATE POLICY "Anyone can create support requests"
  ON public.support_requests
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Policy: Only authenticated users can view all support requests
CREATE POLICY "Authenticated users can view support requests"
  ON public.support_requests
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Only authenticated users can update support requests
CREATE POLICY "Authenticated users can update support requests"
  ON public.support_requests
  FOR UPDATE
  TO authenticated
  USING (true);

COMMENT ON TABLE public.support_requests IS 'Support requests from users';
