-- Simple fix for room_players RLS policies
-- Run this in Supabase Dashboard > SQL Editor

-- Drop all existing room_players policies
DROP POLICY IF EXISTS "room_players_select_policy" ON room_players;
DROP POLICY IF EXISTS "room_players_insert_policy" ON room_players;
DROP POLICY IF EXISTS "room_players_update_policy" ON room_players;
DROP POLICY IF EXISTS "room_players_delete_policy" ON room_players;

-- Create simplified policies without infinite recursion
CREATE POLICY "room_players_select_policy" ON room_players
    FOR SELECT USING (
        -- Allow if user is the player
        user_id = auth.uid() 
        OR 
        -- Allow if room is public (without nested subquery)
        room_id IN (SELECT id FROM rooms WHERE is_private = false)
        OR
        -- Allow if user is room host (without nested subquery)
        room_id IN (SELECT id FROM rooms WHERE host_user_id = auth.uid())
    );

CREATE POLICY "room_players_insert_policy" ON room_players
    FOR INSERT WITH CHECK (
        -- Allow authenticated users to insert
        auth.uid() IS NOT NULL
    );

CREATE POLICY "room_players_update_policy" ON room_players
    FOR UPDATE USING (
        -- Only allow players to update their own records
        user_id = auth.uid()
    );

CREATE POLICY "room_players_delete_policy" ON room_players
    FOR DELETE USING (
        -- Allow if user is the player
        user_id = auth.uid() 
        OR 
        -- Allow if user is room host
        room_id IN (SELECT id FROM rooms WHERE host_user_id = auth.uid())
    );
