import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { PokerEngine, BlackjackEngine, validateMove } from '../../../src/utils/gameEngine.ts';

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

    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const { game_id, action, amount } = await req.json();

    if (!game_id || !action) {
      return new Response(
        JSON.stringify({ error: 'Game ID and action are required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Get current game state
    const { data: game, error: gameError } = await supabaseClient
      .from('games')
      .select('*')
      .eq('id', game_id)
      .is('finished_at', null)
      .single();

    if (gameError || !game) {
      return new Response(
        JSON.stringify({ error: 'Game not found or finished' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Validate move
    const isValidMove = validateMove(game.game_state, user.id, action, amount);
    if (!isValidMove) {
      return new Response(
        JSON.stringify({ error: 'Invalid move' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Apply move based on game type
    let newGameState;
    if (game.game_state.type === 'poker') {
      const engine = new PokerEngine(0); // We'll set the state manually
      newGameState = engine.makeMove(user.id, action as any, amount);
    } else {
      const engine = new BlackjackEngine(0); // We'll set the state manually
      newGameState = engine.makeMove(user.id, action as any);
    }

    // Update game state
    const { error: updateError } = await supabaseClient
      .from('games')
      .update({
        game_state: newGameState,
        ...(newGameState.phase === 'finished' ? { finished_at: new Date().toISOString() } : {})
      })
      .eq('id', game_id);

    if (updateError) {
      return new Response(
        JSON.stringify({ error: 'Failed to update game state' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Record the move
    await supabaseClient
      .from('moves')
      .insert({
        game_id,
        user_id: user.id,
        action,
        payload: { amount },
      });

    return new Response(
      JSON.stringify({ success: true, game_state: newGameState }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error making move:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});