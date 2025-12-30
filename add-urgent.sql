-- Add urgent column to tasks table
ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS urgent BOOLEAN NOT NULL DEFAULT FALSE;

-- Add comment to document the column
COMMENT ON COLUMN tasks.urgent IS 'Indicates if the task is urgent (time-sensitive)';
