-- Complete RLS disable for all room_players operations
-- Run this in Supabase SQL Editor

-- Check current RLS status
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'room_players';

-- Make sure RLS is completely disabled for room_players
ALTER TABLE room_players DISABLE ROW LEVEL SECURITY;

-- Also check and disable RLS for users table if needed for the join operation
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'users';

-- Test the update query that toggleReady uses (replace with your actual room and user IDs)
-- This should work without RLS
UPDATE room_players 
SET is_ready = NOT is_ready 
WHERE room_id = '8f59a7c3-93c1-4f02-aa6e-a39c4aa5e8ed' 
  AND user_id = '71b1f0d9-b39f-486b-83c0-5f8c592b6622';  -- Replace with your user ID

-- Show success message
SELECT 'RLS completely disabled for room_players' as status;
