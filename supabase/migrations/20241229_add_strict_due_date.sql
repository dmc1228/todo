-- Add strict_due_date column to tasks table
ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS strict_due_date BOOLEAN DEFAULT FALSE NOT NULL;

-- Add comment explaining the column
COMMENT ON COLUMN tasks.strict_due_date IS 'Indicates whether this due date is strict/hard deadline vs. flexible';
