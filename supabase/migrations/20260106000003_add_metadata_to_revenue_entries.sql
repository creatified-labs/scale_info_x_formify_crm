-- Add metadata column to revenue_entries table
ALTER TABLE revenue_entries 
ADD COLUMN IF NOT EXISTS metadata JSONB;
