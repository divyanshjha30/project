-- Enable real-time for room_players table
-- Run this in Supabase SQL Editor

-- Check current real-time settings
SELECT schemaname, tablename 
FROM pg_tables 
WHERE tablename IN ('rooms', 'room_players', 'users');

-- Enable real-time replication for room_players (this allows real-time subscriptions)
-- Note: You also need to enable this in the Supabase Dashboard > Database > Replication

-- Test real-time by making a change
UPDATE room_players 
SET is_ready = NOT is_ready 
WHERE user_id = '71b1f0d9-b39f-486b-83c0-5f8c592b6622' 
  AND room_id = (
    SELECT room_id 
    FROM room_players 
    WHERE user_id = '71b1f0d9-b39f-486b-83c0-5f8c592b6622' 
    LIMIT 1
  );

-- This should trigger the real-time subscription in your app
SELECT 'Real-time test update completed' as status;
