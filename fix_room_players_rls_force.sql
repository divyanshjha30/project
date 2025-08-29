-- Fix room_players RLS policies - Force drop and recreate
-- Run this in Supabase SQL Editor

-- First, disable RLS temporarily to ensure we can drop all policies
ALTER TABLE room_players DISABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies (including any custom named ones)
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'room_players' 
        AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON room_players', policy_record.policyname);
        RAISE NOTICE 'Dropped policy: %', policy_record.policyname;
    END LOOP;
END $$;

-- Re-enable RLS
ALTER TABLE room_players ENABLE ROW LEVEL SECURITY;

-- Create new, non-recursive RLS policies for room_players

-- SELECT policy: Allow users to see room players for rooms they're part of or public rooms
CREATE POLICY "room_players_select_policy" ON room_players
    FOR SELECT 
    TO authenticated
    USING (
        -- User can see players in public rooms
        EXISTS (
            SELECT 1 FROM rooms r 
            WHERE r.id = room_players.room_id 
            AND r.is_private = false
        )
        OR
        -- User can see players in rooms they host
        EXISTS (
            SELECT 1 FROM rooms r 
            WHERE r.id = room_players.room_id 
            AND r.host_user_id = auth.uid()
        )
        OR
        -- User can see their own participation
        user_id = auth.uid()
    );

-- INSERT policy: Allow authenticated users to join rooms
CREATE POLICY "room_players_insert_policy" ON room_players
    FOR INSERT 
    TO authenticated
    WITH CHECK (
        user_id = auth.uid()
        AND
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
        user_id = auth.uid()
        OR
        EXISTS (
            SELECT 1 FROM rooms r 
            WHERE r.id = room_players.room_id 
            AND r.host_user_id = auth.uid()
        )
    );

-- Verify policies were created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'room_players' 
AND schemaname = 'public';
