-- Change revenue_entries id column from UUID to TEXT to support booking-prefixed IDs
-- First, we need to drop the primary key constraint
ALTER TABLE revenue_entries DROP CONSTRAINT IF EXISTS revenue_entries_pkey;

-- Change the id column type to TEXT
ALTER TABLE revenue_entries ALTER COLUMN id TYPE TEXT;

-- Re-add the primary key constraint
ALTER TABLE revenue_entries ADD PRIMARY KEY (id);

-- If goal_id references this table, we don't need to change it since goal_id references sales_goals, not revenue_entries
