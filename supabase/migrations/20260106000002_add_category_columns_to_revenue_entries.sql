-- Add category_name and category_color columns to revenue_entries table
ALTER TABLE revenue_entries 
ADD COLUMN IF NOT EXISTS category_name TEXT,
ADD COLUMN IF NOT EXISTS category_color TEXT;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_revenue_entries_category ON revenue_entries(category);
