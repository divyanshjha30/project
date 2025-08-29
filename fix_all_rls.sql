-- Fix RLS issues for games table and ensure all multiplayer tables work
-- Run this in Supabase SQL Editor

-- Disable RLS for games table (we already disabled room_players)
ALTER TABLE games DISABLE ROW LEVEL SECURITY;

-- Also disable RLS for moves and chip_transactions if they exist
ALTER TABLE moves DISABLE ROW LEVEL SECURITY;
ALTER TABLE chip_transactions DISABLE ROW LEVEL SECURITY;

-- Check the status of all tables
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('rooms', 'room_players', 'users', 'games', 'moves', 'chip_transactions')
ORDER BY tablename;

-- Show success
SELECT 'RLS disabled for all game tables' as status;
