import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { PokerEngine, BlackjackEngine } from '../../../src/utils/gameEngine.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { room_id } = await req.json();

    if (!room_id) {
      return new Response(
        JSON.stringify({ error: 'Room ID is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Get room and players
    const { data: room, error: roomError } = await supabaseClient
      .from('rooms')
      .select('*')
      .eq('id', room_id)
      .single();

    if (roomError || !room) {
      return new Response(
        JSON.stringify({ error: 'Room not found' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const { data: players, error: playersError } = await supabaseClient
      .from('room_players')
      .select('*')
      .eq('room_id', room_id)
      .eq('is_ready', true);

    if (playersError || !players || players.length < 2) {
      return new Response(
        JSON.stringify({ error: 'Not enough ready players' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Initialize game engine
    let gameState;
    if (room.game_type === 'poker') {
      const engine = new PokerEngine(players.length, room.min_bet / 2);
      gameState = engine.initializeGame();
      
      // Update player IDs
      gameState.players.forEach((player, index) => {
        player.user_id = players[index].user_id;
      });
    } else {
      const engine = new BlackjackEngine(players.length, room.min_bet);
      gameState = engine.initializeGame();
      
      // Update player IDs
      gameState.players.forEach((player, index) => {
        player.user_id = players[index].user_id;
      });
    }

    // Update room status
    await supabaseClient
      .from('rooms')
      .update({ 
        status: 'playing',
        started_at: new Date().toISOString()
      })
      .eq('id', room_id);

    // Create game record
    const { data: game, error: gameError } = await supabaseClient
      .from('games')
      .insert({
        room_id,
        game_state: gameState,
      })
      .select()
      .single();

    if (gameError) {
      return new Response(
        JSON.stringify({ error: 'Failed to create game' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    return new Response(
      JSON.stringify({ success: true, game_id: game.id }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error starting game:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});