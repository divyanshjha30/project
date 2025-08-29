-- Fix infinite recursion in RLS policies for users table

-- First, drop the problematic policies
DROP POLICY IF EXISTS "Users can view own profile and public data" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Admins can view all users" ON users;
DROP POLICY IF EXISTS "Admins can update any user" ON users;

-- Create fixed policies without recursive references
CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can view public profiles" 
  ON users FOR SELECT
  USING (true); -- Allow viewing all user profiles (for game rooms, etc.)

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Admin policies (simplified to avoid recursion)
CREATE POLICY "Admins have full access"
  ON users FOR ALL
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin')
  WITH CHECK (auth.jwt() ->> 'role' = 'admin');
