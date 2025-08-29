-- COMPLETE DATABASE RESET AND RECREATION
-- Run this in Supabase SQL Editor to start fresh

-- Step 1: Drop all existing tables (cascade to remove dependencies)
DROP TABLE IF EXISTS chip_transactions CASCADE;
DROP TABLE IF EXISTS moves CASCADE;
DROP TABLE IF EXISTS games CASCADE;
DROP TABLE IF EXISTS room_players CASCADE;
DROP TABLE IF EXISTS rooms CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS admin_audit CASCADE;

-- Step 2: Create users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT auth.uid(),
    email TEXT UNIQUE NOT NULL,
    username TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    avatar_url TEXT,
    chip_balance INTEGER DEFAULT 10000 NOT NULL,
    role TEXT DEFAULT 'user' NOT NULL CHECK (role IN ('user', 'admin')),
    total_games INTEGER DEFAULT 0 NOT NULL,
    games_won INTEGER DEFAULT 0 NOT NULL,
    games_lost INTEGER DEFAULT 0 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Step 3: Create rooms table
CREATE TABLE rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    game_type TEXT NOT NULL CHECK (game_type IN ('poker', 'blackjack')),
    host_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'waiting' NOT NULL CHECK (status IN ('waiting', 'playing', 'finished')),
    max_players INTEGER DEFAULT 6 NOT NULL CHECK (max_players BETWEEN 2 AND 8),
    current_players INTEGER DEFAULT 0 NOT NULL,
    min_bet INTEGER DEFAULT 10 NOT NULL,
    is_private BOOLEAN DEFAULT FALSE NOT NULL,
    invite_code TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    started_at TIMESTAMPTZ,
    finished_at TIMESTAMPTZ
);

-- Step 4: Create room_players table
CREATE TABLE room_players (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    seat_index INTEGER NOT NULL,
    chip_count INTEGER NOT NULL,
    is_ready BOOLEAN DEFAULT FALSE NOT NULL,
    joined_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(room_id, user_id),
    UNIQUE(room_id, seat_index)
);

-- Step 5: Create games table
CREATE TABLE games (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    game_state JSONB NOT NULL,
    started_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    finished_at TIMESTAMPTZ
);

-- Step 6: Create moves table
CREATE TABLE moves (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    move_type TEXT NOT NULL,
    amount INTEGER,
    cards JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Step 7: Create chip_transactions table
CREATE TABLE chip_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    game_id UUID REFERENCES games(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL,
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('buy_in', 'win', 'loss', 'bonus')),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Step 8: Create admin_audit table
CREATE TABLE admin_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    target_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Step 9: Enable Row Level Security on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE moves ENABLE ROW LEVEL SECURITY;
ALTER TABLE chip_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_audit ENABLE ROW LEVEL SECURITY;

-- Step 10: Create simple, working RLS policies

-- Users policies - users can see all profiles, but only edit their own
CREATE POLICY "Users can view all profiles" ON users FOR SELECT USING (true);
CREATE POLICY "Users can insert own profile" ON users FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid() = id);

-- Rooms policies - anyone can see public rooms, creators can manage their rooms
CREATE POLICY "Anyone can view public rooms" ON rooms FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create rooms" ON rooms FOR INSERT TO authenticated WITH CHECK (auth.uid() = host_user_id);
CREATE POLICY "Host can update own rooms" ON rooms FOR UPDATE USING (auth.uid() = host_user_id);
CREATE POLICY "Host can delete own rooms" ON rooms FOR DELETE USING (auth.uid() = host_user_id);

-- Room players policies - simple and permissive for multiplayer functionality
CREATE POLICY "Anyone can view room players" ON room_players FOR SELECT USING (true);
CREATE POLICY "Authenticated users can join rooms" ON room_players FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Players can update own records" ON room_players FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Players can leave rooms" ON room_players FOR DELETE USING (auth.uid() = user_id);

-- Games policies - permissive for game functionality
CREATE POLICY "Anyone can view games" ON games FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create games" ON games FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Anyone can update games" ON games FOR UPDATE USING (true);

-- Moves policies - permissive for game moves
CREATE POLICY "Anyone can view moves" ON moves FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create moves" ON moves FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Chip transactions policies
CREATE POLICY "Users can view own transactions" ON chip_transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System can create transactions" ON chip_transactions FOR INSERT TO authenticated WITH CHECK (true);

-- Admin audit policies - only admins
CREATE POLICY "Admins can view audit logs" ON admin_audit FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
);
CREATE POLICY "Admins can create audit logs" ON admin_audit FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
);

-- Step 11: Create useful functions
CREATE OR REPLACE FUNCTION update_room_player_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE rooms SET current_players = current_players + 1 WHERE id = NEW.room_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE rooms SET current_players = current_players - 1 WHERE id = OLD.room_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Step 12: Create triggers
CREATE TRIGGER room_player_count_trigger
    AFTER INSERT OR DELETE ON room_players
    FOR EACH ROW EXECUTE FUNCTION update_room_player_count();

-- Step 13: Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to users table
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Step 14: Enable real-time for all tables using SQL (since Dashboard replication shows "coming soon")
-- Add tables to the supabase_realtime publication for real-time subscriptions

-- Drop existing publication if it exists and recreate
DROP PUBLICATION IF EXISTS supabase_realtime;
CREATE PUBLICATION supabase_realtime;

-- Add all our tables to the real-time publication
ALTER PUBLICATION supabase_realtime ADD TABLE users;
ALTER PUBLICATION supabase_realtime ADD TABLE rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE room_players;
ALTER PUBLICATION supabase_realtime ADD TABLE games;
ALTER PUBLICATION supabase_realtime ADD TABLE moves;
ALTER PUBLICATION supabase_realtime ADD TABLE chip_transactions;

-- Step 15: Grant necessary permissions for real-time
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;

-- Step 16: Enable real-time on the supabase_realtime schema (if needed)
GRANT USAGE ON SCHEMA realtime TO postgres, anon, authenticated, service_role;

SELECT 'Database recreated successfully! 🎉' as status,
       'Real-time enabled via SQL publication - no Dashboard setup needed!' as next_step,
       'You can now use supabase.channel() subscriptions in your React app' as info;
