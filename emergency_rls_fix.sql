-- Emergency RLS fix - temporarily make room_players more accessible
-- Run this in Supabase SQL Editor if the debug shows RLS issues

-- First check current user (this should return your user ID)
SELECT auth.uid();

-- Temporarily make room_players completely open for debugging
DROP POLICY IF EXISTS "room_players_select_policy" ON room_players;

-- Create a very permissive policy temporarily for debugging
CREATE POLICY "room_players_select_policy_debug" ON room_players
    FOR SELECT USING (true); -- Allow all authenticated users to read all room_players

-- This is NOT secure for production but will help us debug the infinite loading issue
-- We'll make it more restrictive once we confirm it works
