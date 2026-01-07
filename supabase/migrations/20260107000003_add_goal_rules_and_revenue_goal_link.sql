-- Add goal_id to revenue_entries for explicit goal linking
ALTER TABLE revenue_entries 
ADD COLUMN IF NOT EXISTS goal_id UUID REFERENCES sales_goals(id) ON DELETE SET NULL;

-- Add event type tracking to revenue entries
ALTER TABLE revenue_entries 
ADD COLUMN IF NOT EXISTS event_type_id UUID REFERENCES event_types(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS event_type_name TEXT;

-- Add rules and auto_link to sales_goals for automated matching
ALTER TABLE sales_goals 
ADD COLUMN IF NOT EXISTS rules JSONB,
ADD COLUMN IF NOT EXISTS auto_link BOOLEAN DEFAULT false;

-- Create index for faster goal-based queries
CREATE INDEX IF NOT EXISTS idx_revenue_entries_goal_id ON revenue_entries(goal_id);
CREATE INDEX IF NOT EXISTS idx_revenue_entries_event_type_id ON revenue_entries(event_type_id);

-- Add comment explaining the rules structure
COMMENT ON COLUMN sales_goals.rules IS 'Array of rule objects: [{ type: "date_range" | "event_type" | "category" | "amount_range" | "source", value: string | number | object }]';
COMMENT ON COLUMN sales_goals.auto_link IS 'Whether to automatically link revenue entries matching the goal rules';
