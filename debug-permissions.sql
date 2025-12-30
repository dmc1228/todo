-- Check if tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('sections', 'projects', 'tasks');

-- Check RLS policies on sections
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'sections';

-- Check if RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('sections', 'projects', 'tasks');

-- Test if you can insert (run this AFTER you've signed up and are logged in)
-- This should work if permissions are correct
INSERT INTO sections (name, position, user_id)
VALUES ('Test Section', 0, auth.uid());

-- If the above works, clean it up
DELETE FROM sections WHERE name = 'Test Section';
