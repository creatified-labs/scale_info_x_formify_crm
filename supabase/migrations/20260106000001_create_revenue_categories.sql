-- Create revenue_categories table
CREATE TABLE IF NOT EXISTS revenue_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, name)
);

-- Add RLS policies
ALTER TABLE revenue_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their company's categories"
  ON revenue_categories FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can insert categories for their company"
  ON revenue_categories FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update their company's categories"
  ON revenue_categories FOR UPDATE
  USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their company's custom categories"
  ON revenue_categories FOR DELETE
  USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
    AND is_default = false
  );

-- Add goal_id column to revenue_entries
ALTER TABLE revenue_entries 
ADD COLUMN IF NOT EXISTS goal_id UUID REFERENCES sales_goals(id) ON DELETE SET NULL;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_revenue_entries_goal_id ON revenue_entries(goal_id);
CREATE INDEX IF NOT EXISTS idx_revenue_categories_company_id ON revenue_categories(company_id);

-- Seed default categories for all existing companies
INSERT INTO revenue_categories (company_id, name, color, is_default)
SELECT 
  id as company_id,
  'Calls',
  '#22c55e',
  true
FROM companies
ON CONFLICT (company_id, name) DO NOTHING;

INSERT INTO revenue_categories (company_id, name, color, is_default)
SELECT 
  id as company_id,
  'Consulting',
  '#3b82f6',
  true
FROM companies
ON CONFLICT (company_id, name) DO NOTHING;

INSERT INTO revenue_categories (company_id, name, color, is_default)
SELECT 
  id as company_id,
  'Investment',
  '#22c55e',
  true
FROM companies
ON CONFLICT (company_id, name) DO NOTHING;

INSERT INTO revenue_categories (company_id, name, color, is_default)
SELECT 
  id as company_id,
  'Stan Store',
  '#a855f7',
  true
FROM companies
ON CONFLICT (company_id, name) DO NOTHING;

INSERT INTO revenue_categories (company_id, name, color, is_default)
SELECT 
  id as company_id,
  'Subscription',
  '#ec4899',
  true
FROM companies
ON CONFLICT (company_id, name) DO NOTHING;

INSERT INTO revenue_categories (company_id, name, color, is_default)
SELECT 
  id as company_id,
  'Invoice Payment',
  '#a855f7',
  true
FROM companies
ON CONFLICT (company_id, name) DO NOTHING;

INSERT INTO revenue_categories (company_id, name, color, is_default)
SELECT 
  id as company_id,
  'Whop',
  '#f97316',
  true
FROM companies
ON CONFLICT (company_id, name) DO NOTHING;

INSERT INTO revenue_categories (company_id, name, color, is_default)
SELECT 
  id as company_id,
  'Freelance',
  '#06b6d4',
  true
FROM companies
ON CONFLICT (company_id, name) DO NOTHING;

INSERT INTO revenue_categories (company_id, name, color, is_default)
SELECT 
  id as company_id,
  'Other',
  '#6b7280',
  true
FROM companies
ON CONFLICT (company_id, name) DO NOTHING;

INSERT INTO revenue_categories (company_id, name, color, is_default)
SELECT 
  id as company_id,
  'Booking Conversions',
  '#6366f1',
  true
FROM companies
ON CONFLICT (company_id, name) DO NOTHING;
