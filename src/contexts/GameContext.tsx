import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  useCallback,
} from "react";
import { supabase } from "../lib/supabase";
import { Room, RoomPlayer, Game, User, PokerGameState, Card } from "../types";
import { useAuth } from "./AuthContext";
import { createDeck, shuffleDeck, dealCards, calculatePokerHandRank } from "../utils/cardUtils";
import toast from "react-hot-toast";

interface GameContextType {
  rooms: Room[];
  currentRoom: Room | null;
  roomPlayers: RoomPlayer[];
  currentGame: Game | null;
  loading: boolean;
  createRoom: (
    name: string,
    gameType: "poker" | "blackjack",
    maxPlayers: number,
    minBet: number,
    isPrivate: boolean,
  ) => Promise<Room | null>;
  joinRoom: (roomId: string, inviteCode?: string) => Promise<boolean>;
  leaveRoom: (roomId: string) => Promise<boolean>;
  toggleReady: () => Promise<boolean>;
  fetchRooms: () => Promise<void>;
  fetchRoomDetails: (roomId: string) => Promise<void>;
  startGame: (roomId: string) => Promise<boolean>;
  makeMove: (action: "fold" | "call" | "raise" | "check", amount?: number) => Promise<boolean>;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error("useGame must be used within a GameProvider");
  }
  return context;
};

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { user } = useAuth();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
  const [roomPlayers, setRoomPlayers] = useState<RoomPlayer[]>([]);
  const [currentGame, setCurrentGame] = useState<Game | null>(null);
  const [loading, setLoading] = useState(false);

  // Use refs to avoid stale closures in realtime callbacks
  const currentRoomRef = useRef<Room | null>(null);
  const lastFetchTimeRef = useRef(0);

  // Keep ref in sync with state
  useEffect(() => {
    currentRoomRef.current = currentRoom;
  }, [currentRoom]);

  // Subscribe to real-time changes
  useEffect(() => {
    if (!user?.id) return;

    console.log("GameContext: Setting up real-time subscriptions...");

    const channelId = `realtime-${user.id}-${Date.now()}`;

    // Single channel for all table changes
    const subscription = supabase
      .channel(channelId)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "rooms" },
        (_payload) => {
          console.log("Real-time: Room changed");
          fetchRoomsInternal();
          // Also refresh current room if we're in one
          if (currentRoomRef.current) {
            fetchRoomDetailsInternal(currentRoomRef.current.id);
          }
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "room_players" },
        (payload) => {
          console.log("Real-time: Room players changed:", payload.eventType);
          if (currentRoomRef.current) {
            fetchRoomDetailsInternal(currentRoomRef.current.id);
          }
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "games" },
        (payload) => {
          console.log("Real-time: Games changed:", payload.eventType);
          if (currentRoomRef.current) {
            fetchRoomDetailsInternal(currentRoomRef.current.id);
          }
        },
      )
      .subscribe((status) => {
        console.log("GameContext: Realtime subscription status:", status);
      });

    return () => {
      console.log("GameContext: Cleaning up real-time subscriptions");
      supabase.removeChannel(subscription);
    };
  }, [user?.id]);

  const fetchRoomsInternal = async () => {
    try {
      const { data, error } = await supabase
        .from("rooms")
        .select(
          `
          *,
          users!rooms_host_user_id_fkey(display_name, username)
        `,
        )
        .eq("status", "waiting")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching rooms:", error);
        return;
      }

      setRooms(data || []);
    } catch (error) {
      console.error("Error fetching rooms:", error);
    }
  };

  const fetchRooms = async () => {
    // Throttle user-triggered calls (minimum 1 second between calls)
    const now = Date.now();
    if (now - lastFetchTimeRef.current < 1000) {
      return;
    }
    lastFetchTimeRef.current = now;
    await fetchRoomsInternal();
  };

  const fetchRoomDetailsInternal = async (roomId: string) => {
    try {
      // Fetch room details
      const { data: roomData, error: roomError } = await supabase
        .from("rooms")
        .select("*")
        .eq("id", roomId)
        .single();

      if (roomError) {
        console.error("Error fetching room:", roomError);
        return;
      }

      setCurrentRoom(roomData);

      // Fetch room players
      const { data: playersData, error: playersError } = await supabase
        .from("room_players")
        .select(
          `
          *,
          users(*)
        `,
        )
        .eq("room_id", roomId)
        .order("seat_index");

      if (playersError) {
        console.error("Error fetching room players:", playersError);
        setRoomPlayers([]);
      } else {
        setRoomPlayers(
          playersData?.map((player) => ({
            ...player,
            user: player.users as User,
          })) || [],
        );
      }

      // Fetch current game if room is playing
      if (roomData.status === "playing") {
        const { data: gameData, error: gameError } = await supabase
          .from("games")
          .select("*")
          .eq("room_id", roomId)
          .is("finished_at", null)
          .order("started_at", { ascending: false })
          .limit(1)
          .single();

        if (!gameError && gameData) {
          setCurrentGame(gameData);
        }
      }
    } catch (error) {
      console.error("Error fetching room details:", error);
    }
  };

  const fetchRoomDetails = async (roomId: string) => {
    try {
      setLoading(true);
      await fetchRoomDetailsInternal(roomId);
    } finally {
      setLoading(false);
    }
  };

  const createRoom = async (
    name: string,
    gameType: "poker" | "blackjack",
    maxPlayers: number,
    minBet: number,
    isPrivate: boolean,
  ): Promise<Room | null> => {
    if (!user) return null;

    try {
      setLoading(true);

      const inviteCode = isPrivate
        ? Math.random().toString(36).substring(2, 8).toUpperCase()
        : null;

      const { data, error } = await supabase
        .from("rooms")
        .insert({
          name,
          game_type: gameType,
          host_user_id: user.id,
          max_players: maxPlayers,
          min_bet: minBet,
          is_private: isPrivate,
          invite_code: inviteCode,
        })
        .select()
        .single();

      if (error) {
        console.error("Error creating room:", error);
        toast.error("Failed to create room");
        return null;
      }

      // Auto-join host as first player
      const { error: joinError } = await supabase.from("room_players").insert({
        room_id: data.id,
        user_id: user.id,
        seat_index: 0,
        chip_count: Math.min(user.chip_balance, 1000),
      });

      if (joinError) {
        console.error("Error auto-joining host:", joinError);
        // Room created but host couldn't join - still return room
      }

      toast.success("Room created successfully!");
      await fetchRoomsInternal();
      return data;
    } catch (error) {
      console.error("Error creating room:", error);
      toast.error("Failed to create room");
      return null;
    } finally {
      setLoading(false);
    }
  };

  const joinRoom = async (
    roomId: string,
    inviteCode?: string,
  ): Promise<boolean> => {
    console.log("joinRoom called with roomId:", roomId, "user:", user?.id);

    if (!user) {
      console.log("joinRoom: No user found, returning false");
      return false;
    }

    try {
      console.log("joinRoom: Setting loading to true");
      setLoading(true);

      console.log("joinRoom: Checking if room exists...");
      // Check if room exists and if invite code is required/valid
      const { data: roomData, error: roomError } = await supabase
        .from("rooms")
        .select("*")
        .eq("id", roomId)
        .single();

      console.log("joinRoom: Room query result:", { roomData, roomError });

      if (roomError || !roomData) {
        console.log("joinRoom: Room not found");
        toast.error("Room not found");
        return false;
      }

      if (roomData.is_private && roomData.invite_code !== inviteCode) {
        console.log("joinRoom: Invalid invite code");
        toast.error("Invalid invite code");
        return false;
      }

      if (roomData.current_players >= roomData.max_players) {
        console.log("joinRoom: Room is full");
        toast.error("Room is full");
        return false;
      }

      console.log("joinRoom: Checking if user is already in room...");
      // Check if user is already in the room
      const { data: existingPlayer, error: checkError } = await supabase
        .from("room_players")
        .select("*")
        .eq("room_id", roomId)
        .eq("user_id", user.id)
        .single();

      console.log("joinRoom: Existing player check:", {
        existingPlayer,
        checkError,
      });

      if (!checkError && existingPlayer) {
        console.log("joinRoom: User already in room, returning true");
        toast.success("You are already in this room");
        return true; // Return true so we navigate to the room
      }

      console.log("joinRoom: Finding available seat...");
      // Find next available seat
      const { data: takenSeats, error: seatsError } = await supabase
        .from("room_players")
        .select("seat_index")
        .eq("room_id", roomId);

      console.log("joinRoom: Taken seats query:", { takenSeats, seatsError });

      console.log("joinRoom: Taken seats query:", { takenSeats, seatsError });

      if (seatsError) {
        console.error("Error checking seats:", seatsError);
        toast.error("Failed to join room");
        return false;
      }

      const takenSeatIndices = takenSeats?.map((s) => s.seat_index) || [];
      let seatIndex = 0;
      while (
        takenSeatIndices.includes(seatIndex) &&
        seatIndex < roomData.max_players
      ) {
        seatIndex++;
      }

      console.log("joinRoom: Selected seat index:", seatIndex);
      console.log("joinRoom: Attempting to insert player into room...");

      // Join the room
      const { error: joinError } = await supabase.from("room_players").insert({
        room_id: roomId,
        user_id: user.id,
        seat_index: seatIndex,
        chip_count: Math.min(user.chip_balance, 1000), // Bring max 1000 chips to table
      });

      console.log("joinRoom: Insert result:", { joinError });

      if (joinError) {
        console.error("Error joining room:", joinError);
        toast.error("Failed to join room");
        return false;
      }

      console.log("joinRoom: Successfully joined room!");
      toast.success("Joined room successfully!");
      return true;
    } catch (error) {
      console.error("Error joining room:", error);
      toast.error("Failed to join room");
      return false;
    } finally {
      console.log("joinRoom: Setting loading to false");
      setLoading(false);
    }
  };

  const leaveRoom = async (roomId: string): Promise<boolean> => {
    if (!user) return false;

    try {
      setLoading(true);

      const { error } = await supabase
        .from("room_players")
        .delete()
        .eq("room_id", roomId)
        .eq("user_id", user.id);

      if (error) {
        console.error("Error leaving room:", error);
        toast.error("Failed to leave room");
        return false;
      }

      setCurrentRoom(null);
      setRoomPlayers([]);
      setCurrentGame(null);
      toast.success("Left room successfully");
      return true;
    } catch (error) {
      console.error("Error leaving room:", error);
      toast.error("Failed to leave room");
      return false;
    } finally {
      setLoading(false);
    }
  };

  const toggleReady = async (): Promise<boolean> => {
    if (!user || !currentRoom) return false;

    try {
      const currentPlayer = roomPlayers.find((p) => p.user_id === user.id);
      if (!currentPlayer) return false;

      const newReadyState = !currentPlayer.is_ready;

      // Optimistic update - immediately reflect in UI
      setRoomPlayers((prev) =>
        prev.map((p) =>
          p.user_id === user.id ? { ...p, is_ready: newReadyState } : p,
        ),
      );

      const { error } = await supabase
        .from("room_players")
        .update({ is_ready: newReadyState })
        .eq("room_id", currentRoom.id)
        .eq("user_id", user.id);

      if (error) {
        console.error("Error toggling ready:", error);
        // Revert optimistic update
        setRoomPlayers((prev) =>
          prev.map((p) =>
            p.user_id === user.id ? { ...p, is_ready: !newReadyState } : p,
          ),
        );
        toast.error("Failed to update ready status");
        return false;
      }

      toast.success(newReadyState ? "Marked as ready!" : "Marked as not ready");
      return true;
    } catch (error) {
      console.error("Error toggling ready:", error);
      toast.error("Failed to update ready status");
      return false;
    }
  };

  // Helper: advance poker phase (flop, turn, river, showdown)
  const advancePhase = (state: PokerGameState) => {
    // Reset for next betting round
    state.players.forEach((p) => {
      if (!p.has_folded) {
        p.has_acted = false;
        p.current_bet = 0;
      }
    });
    state.current_bet = 0;

    // Find first active player after dealer for next round
    const findFirstActive = () => {
      for (let i = 0; i < state.players.length; i++) {
        const idx = (state.dealer_position + 1 + i) % state.players.length;
        if (!state.players[idx].has_folded && !state.players[idx].is_all_in) {
          return idx;
        }
      }
      return 0;
    };

    switch (state.phase) {
      case "preflop": {
        const { cards, remaining } = dealCards(state.deck, 3);
        state.community_cards = cards;
        state.deck = remaining;
        state.phase = "flop";
        state.current_player = findFirstActive();
        break;
      }
      case "flop": {
        const { cards, remaining } = dealCards(state.deck, 1);
        state.community_cards.push(cards[0]);
        state.deck = remaining;
        state.phase = "turn";
        state.current_player = findFirstActive();
        break;
      }
      case "turn": {
        const { cards, remaining } = dealCards(state.deck, 1);
        state.community_cards.push(cards[0]);
        state.deck = remaining;
        state.phase = "river";
        state.current_player = findFirstActive();
        break;
      }
      case "river": {
        state.phase = "showdown";
        determineWinner(state);
        break;
      }
    }

    // If all remaining players are all-in, run out the board
    const activePlayers = state.players.filter(
      (p) => !p.has_folded && !p.is_all_in,
    );
    if (activePlayers.length <= 1 && state.phase !== "showdown" && state.phase !== "finished") {
      while (state.community_cards.length < 5) {
        const { cards, remaining } = dealCards(state.deck, 1);
        state.community_cards.push(cards[0]);
        state.deck = remaining;
      }
      state.phase = "showdown";
      determineWinner(state);
    }
  };

  // Helper: determine winner at showdown
  const determineWinner = (state: PokerGameState) => {
    const nonFolded = state.players.filter((p) => !p.has_folded);
    if (nonFolded.length === 1) {
      nonFolded[0].chip_count += state.pot;
    } else {
      const hands = nonFolded.map((p) => ({
        player: p,
        rank: calculatePokerHandRank([...p.cards, ...state.community_cards]),
      }));
      const bestRank = Math.max(...hands.map((h) => h.rank.rank));
      const winners = hands.filter((h) => h.rank.rank === bestRank);
      const share = Math.floor(state.pot / winners.length);
      winners.forEach((w) => {
        w.player.chip_count += share;
      });
    }
    state.pot = 0;
    state.phase = "finished";
  };

  const startGame = async (roomId: string): Promise<boolean> => {
    if (!user) return false;

    try {
      setLoading(true);

      const { data: readyPlayers, error: playersError } = await supabase
        .from("room_players")
        .select("*")
        .eq("room_id", roomId)
        .eq("is_ready", true)
        .order("seat_index");

      if (playersError || !readyPlayers || readyPlayers.length < 2) {
        toast.error("Need at least 2 ready players to start");
        return false;
      }

      // Update room status to playing
      const { error: roomUpdateError } = await supabase
        .from("rooms")
        .update({ status: "playing", started_at: new Date().toISOString() })
        .eq("id", roomId)
        .eq("status", "waiting");

      if (roomUpdateError) {
        toast.error("Failed to start game");
        return false;
      }

      // Initialize proper poker game state
      const deck = shuffleDeck(createDeck());
      const minBet = currentRoom?.min_bet || 10;
      const smallBlind = Math.floor(minBet / 2);
      const bigBlind = minBet;

      const players = readyPlayers.map((p, i) => ({
        user_id: p.user_id,
        seat_index: p.seat_index,
        cards: [] as Card[],
        chip_count: p.chip_count,
        current_bet: 0,
        has_acted: false,
        has_folded: false,
        is_all_in: false,
      }));

      // Deal hole cards (2 per player)
      let currentDeck = deck;
      for (let round = 0; round < 2; round++) {
        for (const player of players) {
          const { cards, remaining } = dealCards(currentDeck, 1);
          player.cards.push(cards[0]);
          currentDeck = remaining;
        }
      }

      // Post blinds
      const sbIndex = 0; // First player posts small blind
      const bbIndex = 1; // Second player posts big blind

      const sbAmount = Math.min(smallBlind, players[sbIndex].chip_count);
      players[sbIndex].current_bet = sbAmount;
      players[sbIndex].chip_count -= sbAmount;

      const bbAmount = Math.min(bigBlind, players[bbIndex].chip_count);
      players[bbIndex].current_bet = bbAmount;
      players[bbIndex].chip_count -= bbAmount;

      // First to act is player after big blind (or small blind in heads-up)
      const firstToAct = players.length === 2 ? 0 : 2 % players.length;

      const gameState: PokerGameState = {
        type: "poker",
        phase: "preflop",
        deck: currentDeck,
        community_cards: [],
        pot: sbAmount + bbAmount,
        current_bet: bbAmount,
        dealer_position: 0,
        current_player: firstToAct,
        small_blind: smallBlind,
        big_blind: bigBlind,
        players,
      };

      const { error: gameError } = await supabase
        .from("games")
        .insert({ room_id: roomId, game_state: gameState })
        .select()
        .single();

      if (gameError) {
        toast.error("Failed to create game");
        return false;
      }

      toast.success("Game started! Cards are dealt.");
      return true;
    } catch (error) {
      console.error("Error starting game:", error);
      toast.error("Failed to start game");
      return false;
    } finally {
      setLoading(false);
    }
  };

  const makeMove = async (
    action: "fold" | "call" | "raise" | "check",
    amount?: number,
  ): Promise<boolean> => {
    if (!user || !currentGame) return false;

    try {
      const gameState = currentGame.game_state as PokerGameState;
      const playerIndex = gameState.players.findIndex(
        (p) => p.user_id === user.id,
      );

      if (playerIndex === -1) {
        toast.error("You are not in this game");
        return false;
      }

      if (gameState.current_player !== playerIndex) {
        toast.error("It's not your turn");
        return false;
      }

      const player = gameState.players[playerIndex];
      if (player.has_folded) return false;

      // Clone state for mutation
      const newState: PokerGameState = JSON.parse(JSON.stringify(gameState));
      const currentPlayer = newState.players[playerIndex];

      switch (action) {
        case "fold":
          currentPlayer.has_folded = true;
          break;
        case "check":
          if (newState.current_bet > currentPlayer.current_bet) {
            toast.error("You can't check, you need to call or raise");
            return false;
          }
          break;
        case "call": {
          const callAmount = newState.current_bet - currentPlayer.current_bet;
          const actualCall = Math.min(callAmount, currentPlayer.chip_count);
          currentPlayer.current_bet += actualCall;
          currentPlayer.chip_count -= actualCall;
          newState.pot += actualCall;
          if (currentPlayer.chip_count === 0) currentPlayer.is_all_in = true;
          break;
        }
        case "raise": {
          const raiseTotal = amount || newState.current_bet * 2;
          const raiseAmount = raiseTotal - currentPlayer.current_bet;
          const actualRaise = Math.min(raiseAmount, currentPlayer.chip_count);
          currentPlayer.current_bet += actualRaise;
          currentPlayer.chip_count -= actualRaise;
          newState.pot += actualRaise;
          newState.current_bet = currentPlayer.current_bet;
          if (currentPlayer.chip_count === 0) currentPlayer.is_all_in = true;
          // Reset has_acted for other players since there's a new bet to respond to
          newState.players.forEach((p, i) => {
            if (i !== playerIndex && !p.has_folded && !p.is_all_in) {
              p.has_acted = false;
            }
          });
          break;
        }
      }

      currentPlayer.has_acted = true;

      // Check if round is complete
      const activePlayers = newState.players.filter(
        (p) => !p.has_folded && !p.is_all_in,
      );
      const allInPlayers = newState.players.filter(
        (p) => !p.has_folded && p.is_all_in,
      );
      const nonFoldedPlayers = newState.players.filter((p) => !p.has_folded);

      // Check if only one player remains (everyone else folded)
      if (nonFoldedPlayers.length === 1) {
        // Winner by fold
        const winner = nonFoldedPlayers[0];
        winner.chip_count += newState.pot;
        newState.pot = 0;
        newState.phase = "finished";
      } else if (
        activePlayers.every((p) => p.has_acted) &&
        activePlayers.every(
          (p) => p.current_bet === newState.current_bet || p.is_all_in,
        )
      ) {
        // Advance to next phase
        advancePhase(newState);
      } else {
        // Move to next active player
        let next = (playerIndex + 1) % newState.players.length;
        while (
          newState.players[next].has_folded ||
          newState.players[next].is_all_in
        ) {
          next = (next + 1) % newState.players.length;
        }
        newState.current_player = next;
      }

      // Save to database
      const { error } = await supabase
        .from("games")
        .update({ game_state: newState })
        .eq("id", currentGame.id);

      if (error) {
        toast.error("Failed to save move");
        return false;
      }

      // Optimistic update
      setCurrentGame({ ...currentGame, game_state: newState });
      return true;
    } catch (error) {
      console.error("Error making move:", error);
      toast.error("Failed to make move");
      return false;
    }
  };

  // Load initial data
  useEffect(() => {
    if (user) {
      fetchRooms();
    }
  }, [user?.id]); // Only re-run when user.id changes, not on every user object change

  const value = {
    rooms,
    currentRoom,
    roomPlayers,
    currentGame,
    loading,
    createRoom,
    joinRoom,
    leaveRoom,
    toggleReady,
    fetchRooms,
    fetchRoomDetails,
    startGame,
    makeMove,
  };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
};
