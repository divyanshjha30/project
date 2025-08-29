/*
  # Multiplayer Casino Database Schema

  1. New Tables
    - `users` - User profiles with virtual chips and statistics
    - `rooms` - Game rooms/lobbies for multiplayer sessions  
    - `room_players` - Junction table linking users to rooms with game state
    - `games` - Individual game sessions with complete game state
    - `moves` - All player actions/moves within games for audit trail
    - `chip_transactions` - Virtual chip transfers and admin adjustments
    - `admin_audit` - Administrative actions audit log

  2. Security
    - Enable RLS on all tables
    - Users can only access their own data (except admins)
    - Admin role checks enforced server-side
    - Chip transactions restricted to authorized functions

  3. Features
    - Virtual-only chip system with admin controls
    - Real-time multiplayer support via Supabase Realtime
    - Complete game state persistence
    - Audit logging for all administrative actions
    - Room creation with invite codes and privacy settings
*/

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types
CREATE TYPE user_role AS ENUM ('user', 'admin', 'mod');
CREATE TYPE game_type AS ENUM ('poker', 'blackjack');
CREATE TYPE room_status AS ENUM ('waiting', 'playing', 'finished');

-- Users table with profiles and virtual chips
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  username text UNIQUE NOT NULL,
  display_name text NOT NULL,
  avatar_url text,
  chip_balance bigint DEFAULT 10000 NOT NULL,
  role user_role DEFAULT 'user' NOT NULL,
  total_games integer DEFAULT 0 NOT NULL,
  games_won integer DEFAULT 0 NOT NULL,
  games_lost integer DEFAULT 0 NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT positive_chips CHECK (chip_balance >= 0),
  CONSTRAINT valid_stats CHECK (games_won >= 0 AND games_lost >= 0 AND total_games >= games_won + games_lost)
);

-- Game rooms/lobbies
CREATE TABLE IF NOT EXISTS rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  game_type game_type NOT NULL,
  host_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status room_status DEFAULT 'waiting' NOT NULL,
  max_players integer DEFAULT 6 NOT NULL,
  current_players integer DEFAULT 0 NOT NULL,
  min_bet integer DEFAULT 10 NOT NULL,
  invite_code text UNIQUE,
  is_private boolean DEFAULT false NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  started_at timestamptz,
  CONSTRAINT valid_player_count CHECK (current_players <= max_players AND current_players >= 0),
  CONSTRAINT valid_min_bet CHECK (min_bet > 0)
);

-- Players in rooms with their current state
CREATE TABLE IF NOT EXISTS room_players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  seat_index integer NOT NULL,
  joined_at timestamptz DEFAULT now() NOT NULL,
  is_ready boolean DEFAULT false NOT NULL,
  current_bet integer DEFAULT 0 NOT NULL,
  chip_count integer DEFAULT 0 NOT NULL,
  is_active boolean DEFAULT true NOT NULL,
  has_folded boolean DEFAULT false NOT NULL,
  UNIQUE(room_id, user_id),
  UNIQUE(room_id, seat_index),
  CONSTRAINT valid_seat CHECK (seat_index >= 0),
  CONSTRAINT valid_bet CHECK (current_bet >= 0),
  CONSTRAINT valid_chips CHECK (chip_count >= 0)
);

-- Individual games with complete state
CREATE TABLE IF NOT EXISTS games (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  game_state jsonb NOT NULL,
  result jsonb,
  started_at timestamptz DEFAULT now() NOT NULL,
  finished_at timestamptz
);

-- All player moves/actions in games
CREATE TABLE IF NOT EXISTS moves (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Virtual chip transactions and admin adjustments
CREATE TABLE IF NOT EXISTS chip_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount bigint NOT NULL,
  reason text NOT NULL,
  performed_by uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT non_zero_amount CHECK (amount != 0)
);

-- Administrative actions audit log
CREATE TABLE IF NOT EXISTS admin_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  action text NOT NULL,
  amount bigint,
  notes text,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_rooms_game_type ON rooms(game_type);
CREATE INDEX IF NOT EXISTS idx_rooms_status ON rooms(status);
CREATE INDEX IF NOT EXISTS idx_rooms_created_at ON rooms(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_room_players_room_id ON room_players(room_id);
CREATE INDEX IF NOT EXISTS idx_room_players_user_id ON room_players(user_id);
CREATE INDEX IF NOT EXISTS idx_games_room_id ON games(room_id);
CREATE INDEX IF NOT EXISTS idx_moves_game_id ON moves(game_id);
CREATE INDEX IF NOT EXISTS idx_moves_user_id ON moves(user_id);
CREATE INDEX IF NOT EXISTS idx_chip_transactions_user_id ON chip_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_chip_transactions_created_at ON chip_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_admin_id ON admin_audit(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_target_user_id ON admin_audit(target_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_created_at ON admin_audit(created_at DESC);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE moves ENABLE ROW LEVEL SECURITY;
ALTER TABLE chip_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_audit ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
CREATE POLICY "Users can insert own profile"
  ON users FOR INSERT
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can view own profile and public data"
  ON users FOR SELECT
  USING (auth.uid() = id OR role = 'user');

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id AND role = (SELECT role FROM users WHERE id = auth.uid()));

CREATE POLICY "Admins can view all users"
  ON users FOR SELECT
  TO authenticated
  USING ((SELECT role FROM users WHERE id = auth.uid()) = 'admin');

CREATE POLICY "Admins can update any user"
  ON users FOR UPDATE
  TO authenticated
  USING ((SELECT role FROM users WHERE id = auth.uid()) = 'admin');

-- RLS Policies for rooms table
CREATE POLICY "Anyone can view public rooms"
  ON rooms FOR SELECT
  USING (NOT is_private OR auth.uid() = host_user_id);

CREATE POLICY "Authenticated users can create rooms"
  ON rooms FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = host_user_id);

CREATE POLICY "Room hosts can update their rooms"
  ON rooms FOR UPDATE
  USING (auth.uid() = host_user_id);

CREATE POLICY "Admins can manage all rooms"
  ON rooms FOR ALL
  TO authenticated
  USING ((SELECT role FROM users WHERE id = auth.uid()) = 'admin');

-- RLS Policies for room_players table
CREATE POLICY "Players can view room participants"
  ON room_players FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM room_players rp WHERE rp.room_id = room_players.room_id AND rp.user_id = auth.uid())
    OR (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "Users can join rooms"
  ON room_players FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own room state"
  ON room_players FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can leave rooms"
  ON room_players FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for games table
CREATE POLICY "Room participants can view game state"
  ON games FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM room_players rp WHERE rp.room_id = games.room_id AND rp.user_id = auth.uid())
    OR (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "Only authorized functions can modify games"
  ON games FOR INSERT
  WITH CHECK (false); -- Only Edge Functions should insert

-- RLS Policies for moves table  
CREATE POLICY "Room participants can view moves"
  ON moves FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM games g 
      JOIN room_players rp ON g.room_id = rp.room_id 
      WHERE g.id = moves.game_id AND rp.user_id = auth.uid()
    )
    OR (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "Only authorized functions can record moves"
  ON moves FOR INSERT
  WITH CHECK (false); -- Only Edge Functions should insert

-- RLS Policies for chip_transactions table
CREATE POLICY "Users can view own chip transactions"
  ON chip_transactions FOR SELECT
  USING (auth.uid() = user_id OR (SELECT role FROM users WHERE id = auth.uid()) = 'admin');

CREATE POLICY "Only authorized functions can create transactions"
  ON chip_transactions FOR INSERT
  WITH CHECK (false); -- Only Edge Functions should insert

-- RLS Policies for admin_audit table
CREATE POLICY "Only admins can view audit logs"
  ON admin_audit FOR SELECT
  TO authenticated
  USING ((SELECT role FROM users WHERE id = auth.uid()) = 'admin');

CREATE POLICY "Only authorized functions can create audit entries"
  ON admin_audit FOR INSERT
  WITH CHECK (false); -- Only Edge Functions should insert

-- Function to update room player count
CREATE OR REPLACE FUNCTION update_room_player_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE rooms 
    SET current_players = (SELECT COUNT(*) FROM room_players WHERE room_id = NEW.room_id)
    WHERE id = NEW.room_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE rooms 
    SET current_players = (SELECT COUNT(*) FROM room_players WHERE room_id = OLD.room_id)
    WHERE id = OLD.room_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update room player count
CREATE TRIGGER trigger_update_room_player_count
  AFTER INSERT OR DELETE ON room_players
  FOR EACH ROW
  EXECUTE FUNCTION update_room_player_count();

-- Function to update user updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at for users
CREATE TRIGGER trigger_update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();