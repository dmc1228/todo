-- Add recurrence_rule column to tasks table
ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS recurrence_rule TEXT DEFAULT NULL;

-- Add comment explaining the field
COMMENT ON COLUMN tasks.recurrence_rule IS 'Recurrence pattern: null (one-time), "daily", "weekly", "monthly", "yearly"';
