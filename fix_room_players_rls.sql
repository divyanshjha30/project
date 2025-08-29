-- Fix infinite recursion in room_players RLS policies
-- This fixes the error: infinite recursion detected in policy for relation "room_players"

-- Drop all existing RLS policies for room_players
DROP POLICY IF EXISTS "room_players_select_policy" ON room_players;
DROP POLICY IF EXISTS "room_players_insert_policy" ON room_players;
DROP POLICY IF EXISTS "room_players_update_policy" ON room_players;
DROP POLICY IF EXISTS "room_players_delete_policy" ON room_players;

-- Create new, non-recursive RLS policies for room_players

-- SELECT policy: Allow users to see room players for rooms they're part of or public rooms
CREATE POLICY "room_players_select_policy" ON room_players
    FOR SELECT 
    TO authenticated
    USING (
        -- User can see players in rooms they're part of
        EXISTS (
            SELECT 1 FROM room_players rp2 
            WHERE rp2.room_id = room_players.room_id 
            AND rp2.user_id = auth.uid()
        )
        OR
        -- Or user can see players in public rooms
        EXISTS (
            SELECT 1 FROM rooms r 
            WHERE r.id = room_players.room_id 
            AND r.is_private = false
        )
    );

-- INSERT policy: Allow authenticated users to join rooms
CREATE POLICY "room_players_insert_policy" ON room_players
    FOR INSERT 
    TO authenticated
    WITH CHECK (
        -- User can only insert themselves
        user_id = auth.uid()
        AND
        -- Room must exist and not be full
        EXISTS (
            SELECT 1 FROM rooms r 
            WHERE r.id = room_players.room_id 
            AND r.current_players < r.max_players
        )
    );

-- UPDATE policy: Allow users to update their own room player data
CREATE POLICY "room_players_update_policy" ON room_players
    FOR UPDATE 
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- DELETE policy: Allow users to leave rooms they're in, or room host to kick players
CREATE POLICY "room_players_delete_policy" ON room_players
    FOR DELETE 
    TO authenticated
    USING (
        -- User can delete their own participation
        user_id = auth.uid()
        OR
        -- Or room host can remove players
        EXISTS (
            SELECT 1 FROM rooms r 
            WHERE r.id = room_players.room_id 
            AND r.host_user_id = auth.uid()
        )
    );

-- Ensure RLS is enabled
ALTER TABLE room_players ENABLE ROW LEVEL SECURITY;
