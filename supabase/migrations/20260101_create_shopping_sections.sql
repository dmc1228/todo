-- Create organized shopping list sections for Fred Meyer
-- These sections are arranged in typical grocery store walking order

-- Insert shopping sections
-- Note: The position determines the order they appear in the UI
INSERT INTO sections (name, context, position, user_id) VALUES
  ('Produce', 'shopping', 0, (SELECT id FROM auth.users LIMIT 1)),
  ('Bakery', 'shopping', 1, (SELECT id FROM auth.users LIMIT 1)),
  ('Deli & Prepared Foods', 'shopping', 2, (SELECT id FROM auth.users LIMIT 1)),
  ('Meat & Seafood', 'shopping', 3, (SELECT id FROM auth.users LIMIT 1)),
  ('Dairy & Eggs', 'shopping', 4, (SELECT id FROM auth.users LIMIT 1)),
  ('Frozen Foods', 'shopping', 5, (SELECT id FROM auth.users LIMIT 1)),
  ('Pantry & Canned Goods', 'shopping', 6, (SELECT id FROM auth.users LIMIT 1)),
  ('Snacks & Chips', 'shopping', 7, (SELECT id FROM auth.users LIMIT 1)),
  ('Beverages', 'shopping', 8, (SELECT id FROM auth.users LIMIT 1)),
  ('Condiments & Sauces', 'shopping', 9, (SELECT id FROM auth.users LIMIT 1)),
  ('Baking & Cooking', 'shopping', 10, (SELECT id FROM auth.users LIMIT 1)),
  ('Cereal & Breakfast', 'shopping', 11, (SELECT id FROM auth.users LIMIT 1)),
  ('Health & Beauty', 'shopping', 12, (SELECT id FROM auth.users LIMIT 1)),
  ('Household & Cleaning', 'shopping', 13, (SELECT id FROM auth.users LIMIT 1)),
  ('Pet Supplies', 'shopping', 14, (SELECT id FROM auth.users LIMIT 1))
ON CONFLICT DO NOTHING;

-- Display the created sections
SELECT name, context, position
FROM sections
WHERE context = 'shopping'
ORDER BY position;
