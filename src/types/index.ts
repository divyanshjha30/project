export interface User {
  id: string;
  email: string;
  username: string;
  display_name: string;
  avatar_url?: string;
  chip_balance: number;
  role: 'user' | 'admin' | 'mod';
  total_games: number;
  games_won: number;
  games_lost: number;
  created_at: string;
  updated_at: string;
}

export interface Room {
  id: string;
  name: string;
  game_type: 'poker' | 'blackjack';
  host_user_id: string;
  status: 'waiting' | 'playing' | 'finished';
  max_players: number;
  current_players: number;
  min_bet: number;
  invite_code?: string;
  is_private: boolean;
  created_at: string;
  started_at?: string;
}

export interface RoomPlayer {
  id: string;
  room_id: string;
  user_id: string;
  user: User;
  seat_index: number;
  joined_at: string;
  is_ready: boolean;
  current_bet: number;
  chip_count: number;
  is_active: boolean;
  has_folded: boolean;
}

export interface Game {
  id: string;
  room_id: string;
  game_state: PokerGameState | BlackjackGameState;
  result?: any;
  started_at: string;
  finished_at?: string;
}

export interface Card {
  suit: 'hearts' | 'diamonds' | 'clubs' | 'spades';
  rank: string;
  value: number;
  id: string;
}

export interface PokerGameState {
  type: 'poker';
  phase: 'preflop' | 'flop' | 'turn' | 'river' | 'showdown' | 'finished';
  deck: Card[];
  community_cards: Card[];
  pot: number;
  current_bet: number;
  dealer_position: number;
  current_player: number;
  small_blind: number;
  big_blind: number;
  players: PokerPlayer[];
}

export interface PokerPlayer {
  user_id: string;
  seat_index: number;
  cards: Card[];
  chip_count: number;
  current_bet: number;
  has_acted: boolean;
  has_folded: boolean;
  is_all_in: boolean;
}

export interface BlackjackGameState {
  type: 'blackjack';
  phase: 'betting' | 'dealing' | 'playing' | 'dealer_turn' | 'finished';
  deck: Card[];
  dealer_cards: Card[];
  dealer_visible_cards: Card[];
  players: BlackjackPlayer[];
  current_player: number;
  min_bet: number;
}

export interface BlackjackPlayer {
  user_id: string;
  hands: BlackjackHand[];
  current_hand: number;
  total_bet: number;
  has_acted: boolean;
}

export interface BlackjackHand {
  cards: Card[];
  bet: number;
  status: 'playing' | 'stand' | 'bust' | 'blackjack' | 'finished';
  value: number;
  soft_ace: boolean;
}

export interface Move {
  id: string;
  game_id: string;
  user_id: string;
  action: string;
  payload: any;
  created_at: string;
}

export interface ChipTransaction {
  id: string;
  user_id: string;
  amount: number;
  reason: string;
  performed_by?: string;
  created_at: string;
}

export interface AdminAudit {
  id: string;
  admin_id: string;
  target_user_id?: string;
  action: string;
  amount?: number;
  notes?: string;
  created_at: string;
}

export interface RealtimeGameEvent {
  type: 'player_joined' | 'player_left' | 'game_started' | 'move_made' | 'game_ended' | 'chips_updated';
  payload: any;
  timestamp: string;
}