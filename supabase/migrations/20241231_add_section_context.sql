-- Add context field to sections table
ALTER TABLE sections ADD COLUMN IF NOT EXISTS context TEXT NOT NULL DEFAULT 'main';

-- Add view_mode field to projects table  
ALTER TABLE projects ADD COLUMN IF NOT EXISTS view_mode TEXT NOT NULL DEFAULT 'standard';

-- Create index for faster context filtering
CREATE INDEX IF NOT EXISTS idx_sections_context ON sections(context);

-- Update existing sections to have 'main' context (they should already have it from default)
UPDATE sections SET context = 'main' WHERE context IS NULL;
