-- Add length column to tasks table
ALTER TABLE tasks
ADD COLUMN length TEXT CHECK (length IN ('short', 'medium', 'long')) DEFAULT 'medium';
