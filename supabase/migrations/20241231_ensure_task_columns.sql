-- Ensure all required columns exist in tasks table
-- Using ALTER TABLE ... ADD COLUMN IF NOT EXISTS to avoid errors

-- Add strict_due_date if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'tasks' AND column_name = 'strict_due_date'
    ) THEN
        ALTER TABLE tasks ADD COLUMN strict_due_date BOOLEAN NOT NULL DEFAULT false;
    END IF;
END $$;

-- Add recurrence_rule if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'tasks' AND column_name = 'recurrence_rule'
    ) THEN
        ALTER TABLE tasks ADD COLUMN recurrence_rule TEXT;
    END IF;
END $$;

-- Add notes if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'tasks' AND column_name = 'notes'
    ) THEN
        ALTER TABLE tasks ADD COLUMN notes TEXT;
    END IF;
END $$;

-- Add completed_at if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'tasks' AND column_name = 'completed_at'
    ) THEN
        ALTER TABLE tasks ADD COLUMN completed_at TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

-- Add archived if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'tasks' AND column_name = 'archived'
    ) THEN
        ALTER TABLE tasks ADD COLUMN archived BOOLEAN NOT NULL DEFAULT false;
    END IF;
END $$;

-- Add urgent if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'tasks' AND column_name = 'urgent'
    ) THEN
        ALTER TABLE tasks ADD COLUMN urgent BOOLEAN;
    END IF;
END $$;

-- Add length if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'tasks' AND column_name = 'length'
    ) THEN
        ALTER TABLE tasks ADD COLUMN length TEXT;
    END IF;
END $$;
