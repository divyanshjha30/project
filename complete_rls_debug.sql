-- Complete RLS debug and fix for auth.uid() issue
-- Run this in Supabase SQL Editor

-- 1. Check if RLS is enabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('rooms', 'room_players', 'users');

-- 2. Check current policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'room_players'
ORDER BY policyname;

-- 3. Test auth context (this might be null if called from SQL editor vs app)
SELECT 
  auth.uid() as current_user_id,
  current_user as pg_user,
  session_user as session_user;

-- 4. TEMPORARY FIX: Make room_players completely accessible for debugging
-- Drop existing policies
DROP POLICY IF EXISTS "room_players_select_policy" ON room_players;
DROP POLICY IF EXISTS "room_players_select_policy_debug" ON room_players;
DROP POLICY IF EXISTS "room_players_insert_policy" ON room_players;
DROP POLICY IF EXISTS "room_players_update_policy" ON room_players;
DROP POLICY IF EXISTS "room_players_delete_policy" ON room_players;

-- Temporarily disable RLS on room_players to test
ALTER TABLE room_players DISABLE ROW LEVEL SECURITY;

-- Test the room query that was failing
SELECT rp.*, u.display_name, u.username 
FROM room_players rp
LEFT JOIN users u ON rp.user_id = u.id
WHERE rp.room_id = '8f59a7c3-93c1-4f02-aa6e-a39c4aa5e8ed'
ORDER BY rp.seat_index;

-- Show success message
SELECT 'RLS temporarily disabled on room_players for debugging' as status;
