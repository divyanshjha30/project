-- Fix INSERT policy for users table - allow authenticated users to insert their own profile

-- Drop the existing INSERT policy
DROP POLICY IF EXISTS "Users can insert own profile" ON users;

-- Create a new INSERT policy that works correctly
CREATE POLICY "Users can insert own profile" 
  ON users FOR INSERT 
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Also make sure we have a simple SELECT policy for own profile
DROP POLICY IF EXISTS "Users can view own profile" ON users;
CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Allow viewing all profiles for game functionality (you need to see other players)
DROP POLICY IF EXISTS "Users can view public profiles" ON users;
CREATE POLICY "Users can view public profiles" 
  ON users FOR SELECT
  USING (true);
