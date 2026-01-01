-- Create project_collaborators table for sharing projects
CREATE TABLE IF NOT EXISTS project_collaborators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role TEXT CHECK (role IN ('owner', 'editor')) DEFAULT 'editor',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(project_id, user_id)
);

-- Create index for performance
CREATE INDEX idx_project_collaborators_project_id ON project_collaborators(project_id);
CREATE INDEX idx_project_collaborators_user_id ON project_collaborators(user_id);

-- Enable Row Level Security
ALTER TABLE project_collaborators ENABLE ROW LEVEL SECURITY;

-- RLS Policies for project_collaborators
-- Users can view collaborators for projects they own or are collaborators on
CREATE POLICY "Users can view collaborators for their projects"
  ON project_collaborators FOR SELECT
  USING (
    user_id = auth.uid() OR
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

-- Project owners can add collaborators
CREATE POLICY "Project owners can add collaborators"
  ON project_collaborators FOR INSERT
  WITH CHECK (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

-- Project owners can remove collaborators
CREATE POLICY "Project owners can remove collaborators"
  ON project_collaborators FOR DELETE
  USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

-- Update RLS policies for projects to include shared projects
DROP POLICY IF EXISTS "Users can view their own projects" ON projects;
CREATE POLICY "Users can view their own and shared projects"
  ON projects FOR SELECT
  USING (
    auth.uid() = user_id OR
    id IN (
      SELECT project_id FROM project_collaborators WHERE user_id = auth.uid()
    )
  );

-- Users can only update projects they own (not shared ones, unless we want to allow that)
-- Keeping the existing update/delete policies as-is

-- Update RLS policies for tasks to include shared project tasks
DROP POLICY IF EXISTS "Users can view their own tasks" ON tasks;
CREATE POLICY "Users can view their own and shared project tasks"
  ON tasks FOR SELECT
  USING (
    auth.uid() = user_id OR
    project_id IN (
      SELECT project_id FROM project_collaborators WHERE user_id = auth.uid()
    )
  );

-- Allow collaborators to insert tasks in shared projects
DROP POLICY IF EXISTS "Users can insert their own tasks" ON tasks;
CREATE POLICY "Users can insert their own tasks and tasks in shared projects"
  ON tasks FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND (
      -- Either it's their own task (no project)
      project_id IS NULL OR
      -- Or it's in a project they own
      project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()) OR
      -- Or it's in a project they're a collaborator on
      project_id IN (SELECT project_id FROM project_collaborators WHERE user_id = auth.uid())
    )
  );

-- Allow collaborators to update tasks in shared projects
DROP POLICY IF EXISTS "Users can update their own tasks" ON tasks;
CREATE POLICY "Users can update their own tasks and shared project tasks"
  ON tasks FOR UPDATE
  USING (
    auth.uid() = user_id OR
    project_id IN (
      SELECT project_id FROM project_collaborators WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    auth.uid() = user_id OR
    project_id IN (
      SELECT project_id FROM project_collaborators WHERE user_id = auth.uid()
    )
  );

-- Allow collaborators to delete tasks in shared projects
DROP POLICY IF EXISTS "Users can delete their own tasks" ON tasks;
CREATE POLICY "Users can delete their own tasks and shared project tasks"
  ON tasks FOR DELETE
  USING (
    auth.uid() = user_id OR
    project_id IN (
      SELECT project_id FROM project_collaborators WHERE user_id = auth.uid()
    )
  );

-- Grant permissions
GRANT ALL ON project_collaborators TO postgres, anon, authenticated, service_role;

-- Create a view to get user details for collaborators (using auth.users metadata)
-- This will be useful for displaying collaborator info in the UI
CREATE OR REPLACE FUNCTION get_project_collaborators(p_project_id UUID)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  role TEXT,
  email TEXT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    pc.id,
    pc.user_id,
    pc.role,
    au.email,
    pc.created_at
  FROM project_collaborators pc
  JOIN auth.users au ON pc.user_id = au.id
  WHERE pc.project_id = p_project_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to find user ID by email
CREATE OR REPLACE FUNCTION get_user_id_by_email(p_email TEXT)
RETURNS UUID AS $$
DECLARE
  v_user_id UUID;
BEGIN
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = p_email
  LIMIT 1;

  RETURN v_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to add collaborator by email
CREATE OR REPLACE FUNCTION add_project_collaborator_by_email(
  p_project_id UUID,
  p_email TEXT,
  p_role TEXT DEFAULT 'editor'
)
RETURNS JSON AS $$
DECLARE
  v_user_id UUID;
  v_collaborator_id UUID;
  v_result JSON;
BEGIN
  -- Find user by email
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = p_email;

  IF v_user_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'User not found with email: ' || p_email
    );
  END IF;

  -- Check if already a collaborator
  IF EXISTS (
    SELECT 1 FROM project_collaborators
    WHERE project_id = p_project_id AND user_id = v_user_id
  ) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'User is already a collaborator on this project'
    );
  END IF;

  -- Insert collaborator
  INSERT INTO project_collaborators (project_id, user_id, role)
  VALUES (p_project_id, v_user_id, p_role)
  RETURNING id INTO v_collaborator_id;

  -- Return success with collaborator details
  SELECT json_build_object(
    'success', true,
    'collaborator', row_to_json(c)
  ) INTO v_result
  FROM (
    SELECT
      pc.id,
      pc.user_id,
      pc.role,
      au.email,
      pc.created_at
    FROM project_collaborators pc
    JOIN auth.users au ON pc.user_id = au.id
    WHERE pc.id = v_collaborator_id
  ) c;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
