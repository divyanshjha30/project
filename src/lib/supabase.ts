import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'your-supabase-url';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Types for our database tables
export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          username: string;
          display_name: string;
          avatar_url: string | null;
          chip_balance: number;
          role: 'user' | 'admin' | 'mod';
          total_games: number;
          games_won: number;
          games_lost: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['users']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['users']['Insert']>;
      };
      rooms: {
        Row: {
          id: string;
          name: string;
          game_type: 'poker' | 'blackjack';
          host_user_id: string;
          status: 'waiting' | 'playing' | 'finished';
          max_players: number;
          current_players: number;
          min_bet: number;
          invite_code: string | null;
          is_private: boolean;
          created_at: string;
          started_at: string | null;
        };
        Insert: Omit<Database['public']['Tables']['rooms']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['rooms']['Insert']>;
      };
      room_players: {
        Row: {
          id: string;
          room_id: string;
          user_id: string;
          seat_index: number;
          joined_at: string;
          is_ready: boolean;
          current_bet: number;
          chip_count: number;
          is_active: boolean;
          has_folded: boolean;
        };
        Insert: Omit<Database['public']['Tables']['room_players']['Row'], 'id' | 'joined_at'>;
        Update: Partial<Database['public']['Tables']['room_players']['Insert']>;
      };
      games: {
        Row: {
          id: string;
          room_id: string;
          game_state: any;
          result: any | null;
          started_at: string;
          finished_at: string | null;
        };
        Insert: Omit<Database['public']['Tables']['games']['Row'], 'id' | 'started_at'>;
        Update: Partial<Database['public']['Tables']['games']['Insert']>;
      };
      moves: {
        Row: {
          id: string;
          game_id: string;
          user_id: string;
          action: string;
          payload: any;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['moves']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['moves']['Insert']>;
      };
      chip_transactions: {
        Row: {
          id: string;
          user_id: string;
          amount: number;
          reason: string;
          performed_by: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['chip_transactions']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['chip_transactions']['Insert']>;
      };
      admin_audit: {
        Row: {
          id: string;
          admin_id: string;
          target_user_id: string | null;
          action: string;
          amount: number | null;
          notes: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['admin_audit']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['admin_audit']['Insert']>;
      };
    };
  };
};