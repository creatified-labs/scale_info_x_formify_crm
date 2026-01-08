-- Add event_type_id column to sales_goals table for simple event type filtering
ALTER TABLE sales_goals
ADD COLUMN IF NOT EXISTS event_type_id uuid REFERENCES event_types(id) ON DELETE SET NULL;

-- Add comment to explain the column
COMMENT ON COLUMN sales_goals.event_type_id IS 'Optional filter: if set, only revenue from this event type counts toward the goal';

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_sales_goals_event_type_id ON sales_goals(event_type_id);
