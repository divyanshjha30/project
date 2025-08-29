-- Simple game start without edge functions
-- This is a temporary solution to test the "Start Game" functionality
-- Run this in Supabase SQL Editor

CREATE OR REPLACE FUNCTION start_game_simple(room_uuid UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  room_record RECORD;
  ready_players_count INTEGER;
  game_id UUID;
  basic_game_state JSON;
BEGIN
  -- Get room details
  SELECT * INTO room_record FROM rooms WHERE id = room_uuid AND status = 'waiting';
  
  IF NOT FOUND THEN
    RETURN JSON_BUILD_OBJECT('error', 'Room not found or not waiting');
  END IF;
  
  -- Check if enough players are ready
  SELECT COUNT(*) INTO ready_players_count 
  FROM room_players 
  WHERE room_id = room_uuid AND is_ready = true;
  
  IF ready_players_count < 2 THEN
    RETURN JSON_BUILD_OBJECT('error', 'Not enough ready players');
  END IF;
  
  -- Create basic game state
  basic_game_state := JSON_BUILD_OBJECT(
    'type', room_record.game_type,
    'phase', 'preflop',
    'pot', 0,
    'current_player', 0,
    'status', 'active',
    'created_at', NOW()
  );
  
  -- Update room status
  UPDATE rooms 
  SET status = 'playing', started_at = NOW() 
  WHERE id = room_uuid;
  
  -- Create game record
  INSERT INTO games (room_id, game_state)
  VALUES (room_uuid, basic_game_state)
  RETURNING id INTO game_id;
  
  RETURN JSON_BUILD_OBJECT(
    'success', true, 
    'game_id', game_id,
    'message', 'Game started successfully'
  );
END;
$$;
