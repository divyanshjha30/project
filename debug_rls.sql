-- Debug RLS policies - run this in Supabase SQL Editor to test

-- First, let's see current policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'room_players';

-- Test a simple select to see if it works
-- Replace the room_id with your actual room ID: 8f59a7c3-93c1-4f02-aa6e-a39c4aa5e8ed
SELECT * FROM room_players WHERE room_id = '8f59a7c3-93c1-4f02-aa6e-a39c4aa5e8ed';

-- Check if the room exists and is accessible
SELECT * FROM rooms WHERE id = '8f59a7c3-93c1-4f02-aa6e-a39c4aa5e8ed';

-- Check RLS settings
SELECT schemaname, tablename, rowsecurity, forcerowsecurity 
FROM pg_tables 
WHERE tablename IN ('rooms', 'room_players', 'users');
