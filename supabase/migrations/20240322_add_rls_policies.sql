-- Enable RLS on the table (it's already enabled as we see the lock)
ALTER TABLE popular_recipes ENABLE ROW LEVEL SECURITY;

-- Create a policy that allows all operations for all users
CREATE POLICY "Enable all operations for all users" ON popular_recipes
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Note: In a production environment, you might want more restrictive policies
-- This is a permissive policy for development purposes 