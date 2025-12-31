-- Add daily reminders
-- Replace 'YOUR_USER_ID' with your actual user_id from auth.users table

INSERT INTO reminders (name, due_date, completed, user_id) VALUES
  ('Work on in our relationship: What can I do to be a better partner to Gh?', NULL, false, (SELECT id FROM auth.users LIMIT 1)),
  ('Say something nice about D today. About the pregnancy.', NULL, false, (SELECT id FROM auth.users LIMIT 1)),
  ('Do the hardest thing first in the morning', NULL, false, (SELECT id FROM auth.users LIMIT 1)),
  ('Meditate 15 minutes', NULL, false, (SELECT id FROM auth.users LIMIT 1)),
  ('Write', NULL, false, (SELECT id FROM auth.users LIMIT 1)),
  ('Yoga', NULL, false, (SELECT id FROM auth.users LIMIT 1)),
  ('Lift (to prevent injury and be able to age well)', NULL, false, (SELECT id FROM auth.users LIMIT 1)),
  ('Music (Guitar exercises, songs, Bach cello suites)', NULL, false, (SELECT id FROM auth.users LIMIT 1)),
  ('Core exercises', NULL, false, (SELECT id FROM auth.users LIMIT 1)),
  ('What would I do if I only had 5 years left? What seeds would I plant if I knew I''d love to 100?', NULL, false, (SELECT id FROM auth.users LIMIT 1)),
  ('Read chapters and articles without touching phone', NULL, false, (SELECT id FROM auth.users LIMIT 1)),
  ('What am I learning right now? Beginners mind.', NULL, false, (SELECT id FROM auth.users LIMIT 1)),
  ('Short walk outside morning and evening', NULL, false, (SELECT id FROM auth.users LIMIT 1)),
  ('I should be spending 90% of my time on projects I really care about. Wind down time on things like the house.', NULL, false, (SELECT id FROM auth.users LIMIT 1)),
  ('Do the things I care about for 20 minutes every day. Reading, writing, lifting, basketball, stretching/yoga', NULL, false, (SELECT id FROM auth.users LIMIT 1)),
  ('What is the most important thing to do today?', NULL, false, (SELECT id FROM auth.users LIMIT 1)),
  ('Date nights, weekends away, check ins, gratitudes', NULL, false, (SELECT id FROM auth.users LIMIT 1)),
  ('Ask weekly what is a hard thing I''ll do', NULL, false, (SELECT id FROM auth.users LIMIT 1));
