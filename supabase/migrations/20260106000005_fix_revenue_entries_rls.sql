-- Fix RLS policies for revenue_entries table to allow inserts

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can insert their own revenue entries" ON revenue_entries;
DROP POLICY IF EXISTS "Users can view their own revenue entries" ON revenue_entries;
DROP POLICY IF EXISTS "Users can update their own revenue entries" ON revenue_entries;
DROP POLICY IF EXISTS "Users can delete their own revenue entries" ON revenue_entries;

-- Enable RLS
ALTER TABLE revenue_entries ENABLE ROW LEVEL SECURITY;

-- Create comprehensive policies
-- Allow users to view revenue entries for their company
CREATE POLICY "Users can view their company revenue entries"
ON revenue_entries FOR SELECT
USING (
  company_id IN (
    SELECT company_id FROM users WHERE id = auth.uid()
  )
);

-- Allow users to insert revenue entries for their company
CREATE POLICY "Users can insert their company revenue entries"
ON revenue_entries FOR INSERT
WITH CHECK (
  company_id IN (
    SELECT company_id FROM users WHERE id = auth.uid()
  )
);

-- Allow users to update revenue entries for their company
CREATE POLICY "Users can update their company revenue entries"
ON revenue_entries FOR UPDATE
USING (
  company_id IN (
    SELECT company_id FROM users WHERE id = auth.uid()
  )
)
WITH CHECK (
  company_id IN (
    SELECT company_id FROM users WHERE id = auth.uid()
  )
);

-- Allow users to delete revenue entries for their company
CREATE POLICY "Users can delete their company revenue entries"
ON revenue_entries FOR DELETE
USING (
  company_id IN (
    SELECT company_id FROM users WHERE id = auth.uid()
  )
);
