import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  useCallback,
} from "react";
import { supabase } from "../lib/supabase";
import {
  Room,
  RoomPlayer,
  Game,
  User,
  PokerGameState,
  BlackjackGameState,
  BlackjackPlayer,
  BlackjackHand,
  BlackjackResult,
  Card,
} from "../types";
import { useAuth } from "./AuthContext";
import {
  createDeck,
  shuffleDeck,
  dealCards,
  calculatePokerHandRank,
  calculateBlackjackValue,
} from "../utils/cardUtils";
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
  makeMove: (
    action: "fold" | "call" | "raise" | "check",
    amount?: number,
  ) => Promise<boolean>;
  makeBlackjackMove: (
    action: "hit" | "stand" | "double_down" | "split",
  ) => Promise<boolean>;
  dealNextHand: () => Promise<boolean>;
  dealNextBlackjackRound: () => Promise<boolean>;
  forceFoldCurrentPlayer: () => Promise<boolean>;
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
  const { user, refreshUser } = useAuth();
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

  // Stable channel ID to avoid creating too many channels during HMR
  const channelIdRef = useRef(
    `realtime-${Math.random().toString(36).slice(2)}`,
  );

  // Subscribe to real-time changes
  useEffect(() => {
    if (!user?.id) return;

    console.log("GameContext: Setting up real-time subscriptions...");

    const channelId = `${channelIdRef.current}-${user.id}`;

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
        if (status === "SUBSCRIBED") {
          // Refetch data on successful (re)connection to avoid stale state
          fetchRoomsInternal();
          if (currentRoomRef.current) {
            fetchRoomDetailsInternal(currentRoomRef.current.id);
          }
        }
        if (status === "CHANNEL_ERROR") {
          // Retry after a brief delay
          console.warn("GameContext: Channel error, will retry...");
          setTimeout(() => {
            subscription.subscribe();
          }, 2000);
        }
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

      // Clean up any empty waiting rooms (players left without clicking Leave)
      const rooms = data || [];
      const emptyRoomIds: string[] = [];
      for (const room of rooms) {
        if (room.current_players === 0) {
          emptyRoomIds.push(room.id);
        }
      }
      if (emptyRoomIds.length > 0) {
        await supabase
          .from("rooms")
          .update({ status: "finished" })
          .in("id", emptyRoomIds);
      }

      setRooms(rooms.filter((r) => !emptyRoomIds.includes(r.id)));
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

      // If there's an active game, auto-fold the leaving player
      if (currentGame?.game_state) {
        const gameState = currentGame.game_state as PokerGameState;
        const playerIndex = gameState.players?.findIndex(
          (p) => p.user_id === user.id,
        );
        if (
          playerIndex !== undefined &&
          playerIndex >= 0 &&
          !gameState.players[playerIndex].has_folded
        ) {
          const newState: PokerGameState = JSON.parse(
            JSON.stringify(gameState),
          );
          newState.players[playerIndex].has_folded = true;

          // If it was this player's turn, advance to next player
          if (newState.current_player === playerIndex) {
            const nonFoldedPlayers = newState.players.filter(
              (p) => !p.has_folded,
            );
            if (nonFoldedPlayers.length === 1) {
              // Only one player left — they win
              const winner = nonFoldedPlayers[0];
              winner.chip_count += newState.pot;
              newState.pot = 0;
              newState.phase = "finished";
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
          } else {
            // Not their turn, just check if only 1 player left
            const nonFoldedPlayers = newState.players.filter(
              (p) => !p.has_folded,
            );
            if (nonFoldedPlayers.length === 1) {
              const winner = nonFoldedPlayers[0];
              winner.chip_count += newState.pot;
              newState.pot = 0;
              newState.phase = "finished";
            }
          }

          await supabase
            .from("games")
            .update({ game_state: newState })
            .eq("id", currentGame.id);
        }
      }

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

      // Check if room is now empty — if so, mark it as finished
      const { data: remainingPlayers } = await supabase
        .from("room_players")
        .select("id")
        .eq("room_id", roomId);

      if (!remainingPlayers || remainingPlayers.length === 0) {
        await supabase
          .from("rooms")
          .update({ status: "finished" })
          .eq("id", roomId);
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
    if (
      activePlayers.length <= 1 &&
      state.phase !== "showdown" &&
      state.phase !== "finished"
    ) {
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
    const potTotal = state.pot;
    const nonFolded = state.players.filter((p) => !p.has_folded);
    const foldedPlayers = state.players.filter((p) => p.has_folded);

    if (nonFolded.length === 1) {
      // Won by everyone else folding
      const winner = nonFolded[0];
      winner.chip_count += potTotal;
      state.result = {
        winners: [
          {
            user_id: winner.user_id,
            hand_description: "Last player standing",
            chips_won: potTotal,
          },
        ],
        losers: foldedPlayers.map((p) => ({
          user_id: p.user_id,
          hand_description: "Folded",
          chips_lost: 0,
          folded: true,
        })),
        pot_total: potTotal,
        winning_hand: "Everyone else folded",
      };
    } else {
      // Evaluate hands
      const hands = nonFolded.map((p) => ({
        player: p,
        rank: calculatePokerHandRank([...p.cards, ...state.community_cards]),
      }));
      const bestRank = Math.max(...hands.map((h) => h.rank.rank));
      const winners = hands.filter((h) => h.rank.rank === bestRank);
      const losers = hands.filter((h) => h.rank.rank !== bestRank);
      const share = Math.floor(potTotal / winners.length);

      winners.forEach((w) => {
        w.player.chip_count += share;
      });

      state.result = {
        winners: winners.map((w) => ({
          user_id: w.player.user_id,
          hand_description: w.rank.description,
          chips_won: share,
        })),
        losers: [
          ...losers.map((l) => ({
            user_id: l.player.user_id,
            hand_description: l.rank.description,
            chips_lost: 0,
            folded: false,
          })),
          ...foldedPlayers.map((p) => ({
            user_id: p.user_id,
            hand_description: "Folded",
            chips_lost: 0,
            folded: true,
          })),
        ],
        pot_total: potTotal,
        winning_hand: winners[0].rank.description,
      };
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

      const gameType = currentRoom?.game_type || "poker";
      const minPlayers = gameType === "blackjack" ? 1 : 2;

      if (playersError || !readyPlayers || readyPlayers.length < minPlayers) {
        toast.error(
          gameType === "blackjack"
            ? "Need at least 1 ready player to start"
            : "Need at least 2 ready players to start",
        );
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

      if (gameType === "blackjack") {
        // ─── BLACKJACK GAME START ───
        const deck = shuffleDeck(createDeck());
        const minBet = currentRoom?.min_bet || 10;
        let currentDeck = deck;

        const players: BlackjackPlayer[] = readyPlayers.map((p) => {
          // Auto-bet the min bet for each player
          const bet = Math.min(minBet, p.chip_count);
          const { cards, remaining } = dealCards(currentDeck, 2);
          currentDeck = remaining;

          const handValue = calculateBlackjackValue(cards);
          const isBlackjack = cards.length === 2 && handValue.value === 21;

          return {
            user_id: p.user_id,
            hands: [
              {
                cards,
                bet,
                status: isBlackjack
                  ? ("blackjack" as const)
                  : ("playing" as const),
                value: handValue.value,
                soft_ace: handValue.soft,
              },
            ],
            current_hand: 0,
            total_bet: bet,
            has_acted: isBlackjack,
          };
        });

        // Deal dealer cards (1 face-up, 1 face-down)
        const { cards: dealerCards, remaining: finalDeck } = dealCards(
          currentDeck,
          2,
        );

        // Find first player who doesn't have blackjack
        let firstPlayer = 0;
        while (firstPlayer < players.length && players[firstPlayer].has_acted) {
          firstPlayer++;
        }

        let gameState: BlackjackGameState = {
          type: "blackjack",
          phase: firstPlayer >= players.length ? "dealer_turn" : "playing",
          deck: finalDeck,
          dealer_cards: dealerCards,
          dealer_visible_cards: [dealerCards[0]], // Only first card is visible
          players,
          current_player: firstPlayer >= players.length ? -1 : firstPlayer,
          min_bet: minBet,
        };

        // If all players had blackjack, run dealer turn immediately
        if (gameState.phase === "dealer_turn") {
          gameState = runDealerTurn(gameState);
        }

        const { error: gameError } = await supabase
          .from("games")
          .insert({ room_id: roomId, game_state: gameState })
          .select()
          .single();

        if (gameError) {
          toast.error("Failed to create game");
          return false;
        }

        // Update chips if game finished immediately
        if (gameState.phase === "finished" && gameState.results) {
          await updateBlackjackChips(gameState.results, roomId);
        }
      } else {
        // ─── POKER GAME START ───
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

        let currentDeck = deck;
        for (let round = 0; round < 2; round++) {
          for (const player of players) {
            const { cards, remaining } = dealCards(currentDeck, 1);
            player.cards.push(cards[0]);
            currentDeck = remaining;
          }
        }

        const dealerPos = 0;
        let sbIndex: number, bbIndex: number, firstToAct: number;

        if (players.length === 2) {
          sbIndex = dealerPos;
          bbIndex = (dealerPos + 1) % players.length;
          firstToAct = dealerPos;
        } else {
          sbIndex = (dealerPos + 1) % players.length;
          bbIndex = (dealerPos + 2) % players.length;
          firstToAct = (dealerPos + 3) % players.length;
        }

        const sbAmount = Math.min(smallBlind, players[sbIndex].chip_count);
        players[sbIndex].current_bet = sbAmount;
        players[sbIndex].chip_count -= sbAmount;

        const bbAmount = Math.min(bigBlind, players[bbIndex].chip_count);
        players[bbIndex].current_bet = bbAmount;
        players[bbIndex].chip_count -= bbAmount;

        const gameState: PokerGameState = {
          type: "poker",
          phase: "preflop",
          deck: currentDeck,
          community_cards: [],
          pot: sbAmount + bbAmount,
          current_bet: bbAmount,
          dealer_position: dealerPos,
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

      // If poker hand finished, persist chip changes and update stats
      if (newState.phase === "finished" && newState.result && currentRoom) {
        await updatePokerChips(newState, currentRoom.id);
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

  // Force-fold the current player (used when timer expires — any connected client can trigger this)
  const forceFoldCurrentPlayer = async (): Promise<boolean> => {
    if (!currentGame?.game_state) return false;

    const gameState = currentGame.game_state as PokerGameState;
    if (gameState.phase === "finished" || gameState.phase === "showdown")
      return false;

    const playerIndex = gameState.current_player;
    if (
      playerIndex === undefined ||
      playerIndex < 0 ||
      gameState.players[playerIndex].has_folded
    )
      return false;

    const newState: PokerGameState = JSON.parse(JSON.stringify(gameState));
    newState.players[playerIndex].has_folded = true;
    newState.players[playerIndex].has_acted = true;

    const nonFoldedPlayers = newState.players.filter((p) => !p.has_folded);

    if (nonFoldedPlayers.length === 1) {
      // Only one player left — they win
      const winner = nonFoldedPlayers[0];
      winner.chip_count += newState.pot;
      newState.pot = 0;
      newState.phase = "finished";
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

    const { error } = await supabase
      .from("games")
      .update({ game_state: newState })
      .eq("id", currentGame.id);

    if (error) {
      console.error("Error force-folding player:", error);
      return false;
    }

    return true;
  };

  // ─── BLACKJACK MOVE LOGIC ───
  const makeBlackjackMove = async (
    action: "hit" | "stand" | "double_down" | "split",
  ): Promise<boolean> => {
    if (!user || !currentRoom || !currentGame) return false;

    const state = currentGame.game_state as BlackjackGameState;
    if (state.type !== "blackjack" || state.phase !== "playing") return false;

    const playerIndex = state.players.findIndex((p) => p.user_id === user.id);
    if (playerIndex === -1 || playerIndex !== state.current_player)
      return false;

    const player = { ...state.players[playerIndex] };
    const hand = { ...player.hands[player.current_hand] };
    let deck = [...state.deck];

    switch (action) {
      case "hit": {
        const { cards, remaining } = dealCards(deck, 1);
        hand.cards = [...hand.cards, cards[0]];
        deck = remaining;
        const val = calculateBlackjackValue(hand.cards);
        hand.value = val.value;
        hand.soft_ace = val.soft;
        if (val.value > 21) {
          hand.status = "bust";
        }
        break;
      }
      case "stand": {
        hand.status = "stand";
        break;
      }
      case "double_down": {
        // Double the bet, take exactly one card, then stand
        hand.bet *= 2;
        player.total_bet += hand.bet / 2; // Add the extra bet amount
        const { cards, remaining } = dealCards(deck, 1);
        hand.cards = [...hand.cards, cards[0]];
        deck = remaining;
        const val = calculateBlackjackValue(hand.cards);
        hand.value = val.value;
        hand.soft_ace = val.soft;
        hand.status = val.value > 21 ? "bust" : "stand";
        break;
      }
      case "split": {
        // Can only split if first 2 cards have same rank
        if (
          hand.cards.length !== 2 ||
          hand.cards[0].rank !== hand.cards[1].rank
        )
          return false;

        // Create two new hands from the split
        const { cards: card1, remaining: deck1 } = dealCards(deck, 1);
        const { cards: card2, remaining: deck2 } = dealCards(deck1, 1);
        deck = deck2;

        const hand1Cards = [hand.cards[0], card1[0]];
        const hand2Cards = [hand.cards[1], card2[0]];

        const val1 = calculateBlackjackValue(hand1Cards);
        const val2 = calculateBlackjackValue(hand2Cards);

        const newHand1: BlackjackHand = {
          cards: hand1Cards,
          bet: hand.bet,
          status: "playing",
          value: val1.value,
          soft_ace: val1.soft,
        };
        const newHand2: BlackjackHand = {
          cards: hand2Cards,
          bet: hand.bet,
          status: "playing",
          value: val2.value,
          soft_ace: val2.soft,
        };

        player.hands = [
          ...player.hands.slice(0, player.current_hand),
          newHand1,
          newHand2,
          ...player.hands.slice(player.current_hand + 1),
        ];
        player.total_bet += hand.bet; // Additional bet for second hand

        // Update game state with split and return
        const updatedPlayers = [...state.players];
        updatedPlayers[playerIndex] = player;

        const splitState: BlackjackGameState = {
          ...state,
          deck,
          players: updatedPlayers,
        };

        const { error } = await supabase
          .from("games")
          .update({ game_state: splitState })
          .eq("id", currentGame.id);

        if (error) {
          toast.error("Failed to make move");
          return false;
        }
        return true;
      }
    }

    // Update hand in player
    if (action !== "split") {
      player.hands = [
        ...player.hands.slice(0, player.current_hand),
        hand,
        ...player.hands.slice(player.current_hand + 1),
      ];
    }

    // Advance to next hand or next player if current hand is done
    let nextHandIndex = player.current_hand;
    let nextPlayerIndex = state.current_player;
    let phase = state.phase;

    if (hand.status !== "playing") {
      // Move to next hand for this player
      nextHandIndex = player.current_hand + 1;
      if (nextHandIndex >= player.hands.length) {
        // All hands done for this player, move to next
        player.has_acted = true;
        player.current_hand = 0;
        nextPlayerIndex = state.current_player + 1;

        // Find next player who hasn't acted
        while (
          nextPlayerIndex < state.players.length &&
          state.players[nextPlayerIndex].has_acted
        ) {
          nextPlayerIndex++;
        }

        if (nextPlayerIndex >= state.players.length) {
          phase = "dealer_turn";
        }
      } else {
        player.current_hand = nextHandIndex;
      }
    }

    // Update players array
    const updatedPlayers = [...state.players];
    updatedPlayers[playerIndex] = player;

    let newState: BlackjackGameState = {
      ...state,
      deck,
      players: updatedPlayers,
      current_player: phase === "dealer_turn" ? -1 : nextPlayerIndex,
      phase: phase as BlackjackGameState["phase"],
    };

    // If dealer_turn, run dealer logic
    if (phase === "dealer_turn") {
      newState = runDealerTurn(newState);
    }

    const { error } = await supabase
      .from("games")
      .update({ game_state: newState })
      .eq("id", currentGame.id);

    if (error) {
      toast.error("Failed to make move");
      return false;
    }

    // Update chips in DB after round finishes
    if (newState.phase === "finished" && newState.results && currentRoom) {
      await updateBlackjackChips(newState.results, currentRoom.id);
    }

    return true;
  };

  // Dealer hits until 17+, then determine winners
  const runDealerTurn = (state: BlackjackGameState): BlackjackGameState => {
    let deck = [...state.deck];
    let dealerCards = [...state.dealer_cards];

    // Check if all players busted — dealer doesn't need to draw
    const allBusted = state.players.every((p) =>
      p.hands.every((h) => h.status === "bust"),
    );

    if (!allBusted) {
      // Dealer hits until hard 17 or above
      let dealerVal = calculateBlackjackValue(dealerCards);
      while (dealerVal.value < 17) {
        const { cards, remaining } = dealCards(deck, 1);
        dealerCards = [...dealerCards, cards[0]];
        deck = remaining;
        dealerVal = calculateBlackjackValue(dealerCards);
      }
    }

    const dealerVal = calculateBlackjackValue(dealerCards);
    const dealerBust = dealerVal.value > 21;
    const dealerBlackjack = dealerCards.length === 2 && dealerVal.value === 21;

    // Calculate results for each player
    const results: BlackjackResult[] = [];

    const finalPlayers = state.players.map((player) => {
      let netChips = 0;
      const handsSummary: string[] = [];

      const newHands = player.hands.map((hand) => {
        if (hand.status === "bust") {
          netChips -= hand.bet;
          handsSummary.push(`Bust (-$${hand.bet})`);
          return { ...hand, status: "finished" as const };
        }

        const isNaturalBlackjack = hand.cards.length === 2 && hand.value === 21;

        if (isNaturalBlackjack) {
          if (dealerBlackjack) {
            // Push — return bet
            handsSummary.push(`Blackjack vs Blackjack (Push)`);
          } else {
            // Blackjack pays 3:2
            const winnings = Math.floor(hand.bet * 1.5);
            netChips += winnings;
            handsSummary.push(`Blackjack! (+$${winnings})`);
          }
          return { ...hand, status: "finished" as const };
        }

        if (dealerBust) {
          netChips += hand.bet;
          handsSummary.push(`Win (dealer bust) (+$${hand.bet})`);
          return { ...hand, status: "finished" as const };
        }

        if (hand.value > dealerVal.value) {
          netChips += hand.bet;
          handsSummary.push(
            `Win ${hand.value} vs ${dealerVal.value} (+$${hand.bet})`,
          );
        } else if (hand.value === dealerVal.value) {
          handsSummary.push(`Push ${hand.value} vs ${dealerVal.value} ($0)`);
        } else {
          netChips -= hand.bet;
          handsSummary.push(
            `Lose ${hand.value} vs ${dealerVal.value} (-$${hand.bet})`,
          );
        }

        return { ...hand, status: "finished" as const };
      });

      results.push({
        user_id: player.user_id,
        net_chips: netChips,
        hands_summary: handsSummary,
      });

      return { ...player, hands: newHands, has_acted: true };
    });

    return {
      ...state,
      deck,
      dealer_cards: dealerCards,
      dealer_visible_cards: dealerCards, // Reveal all dealer cards
      players: finalPlayers,
      phase: "finished",
      current_player: -1,
      results,
    };
  };

  // Helper: update user game stats (total_games, games_won, games_lost)
  const updateGameStats = async (userId: string, won: boolean) => {
    const { data: userData } = await supabase
      .from("users")
      .select("total_games, games_won, games_lost")
      .eq("id", userId)
      .single();

    if (userData) {
      await supabase
        .from("users")
        .update({
          total_games: userData.total_games + 1,
          games_won: userData.games_won + (won ? 1 : 0),
          games_lost: userData.games_lost + (won ? 0 : 1),
        })
        .eq("id", userId);
    }
  };

  // Update chip counts and stats in DB after poker hand
  const updatePokerChips = async (state: PokerGameState, roomId: string) => {
    if (!state.result) return;

    const winnerIds = state.result.winners.map(
      (w: { user_id: string }) => w.user_id,
    );

    for (const player of state.players) {
      // Get their chip count BEFORE this hand (stored in room_players)
      const { data: prevData } = await supabase
        .from("room_players")
        .select("chip_count")
        .eq("room_id", roomId)
        .eq("user_id", player.user_id)
        .single();

      const prevChips = prevData?.chip_count || 0;
      const netChange = player.chip_count - prevChips;

      // Sync room_players chip_count from final game state
      await supabase
        .from("room_players")
        .update({ chip_count: player.chip_count })
        .eq("room_id", roomId)
        .eq("user_id", player.user_id);

      // Update global users.chip_balance
      if (netChange !== 0) {
        const { data: userData } = await supabase
          .from("users")
          .select("chip_balance")
          .eq("id", player.user_id)
          .single();

        if (userData) {
          const newBalance = Math.max(0, userData.chip_balance + netChange);
          await supabase
            .from("users")
            .update({ chip_balance: newBalance })
            .eq("id", player.user_id);
        }
      }

      // Update game stats
      const isWinner = winnerIds.includes(player.user_id);
      await updateGameStats(player.user_id, isWinner);
    }

    // Refresh current user
    await refreshUser();
  };

  // Update chip counts in DB after blackjack round
  const updateBlackjackChips = async (
    results: BlackjackResult[],
    roomId: string,
  ) => {
    for (const result of results) {
      // Update game stats for all players
      const won = result.net_chips > 0;
      await updateGameStats(result.user_id, won);

      if (result.net_chips !== 0) {
        // Update room_players chip_count (table chips)
        const { data: playerData } = await supabase
          .from("room_players")
          .select("chip_count")
          .eq("room_id", roomId)
          .eq("user_id", result.user_id)
          .single();

        if (playerData) {
          const newCount = Math.max(
            0,
            playerData.chip_count + result.net_chips,
          );
          await supabase
            .from("room_players")
            .update({ chip_count: newCount })
            .eq("room_id", roomId)
            .eq("user_id", result.user_id);
        }

        // Update users.chip_balance (global balance shown on homepage)
        const { data: userData } = await supabase
          .from("users")
          .select("chip_balance")
          .eq("id", result.user_id)
          .single();

        if (userData) {
          const newBalance = Math.max(
            0,
            userData.chip_balance + result.net_chips,
          );
          await supabase
            .from("users")
            .update({ chip_balance: newBalance })
            .eq("id", result.user_id);
        }
      }
    }

    // Refresh the current user's profile so navbar/homepage reflects new balance
    await refreshUser();
  };

  const dealNextBlackjackRound = async (): Promise<boolean> => {
    if (!user || !currentRoom || !currentGame) return false;

    const state = currentGame.game_state as BlackjackGameState;
    if (state.type !== "blackjack" || state.phase !== "finished") return false;

    const { data: roomPlayerData } = await supabase
      .from("room_players")
      .select("*")
      .eq("room_id", currentRoom.id)
      .order("seat_index");

    if (!roomPlayerData || roomPlayerData.length < 1) {
      toast.error("Not enough players for next round");
      return false;
    }

    const deck = shuffleDeck(createDeck());
    const minBet = state.min_bet;
    let currentDeck = deck;

    const players: BlackjackPlayer[] = roomPlayerData.map((p) => {
      const bet = Math.min(minBet, p.chip_count);
      const { cards, remaining } = dealCards(currentDeck, 2);
      currentDeck = remaining;
      const handValue = calculateBlackjackValue(cards);
      const isBlackjack = cards.length === 2 && handValue.value === 21;

      return {
        user_id: p.user_id,
        hands: [
          {
            cards,
            bet,
            status: isBlackjack ? ("blackjack" as const) : ("playing" as const),
            value: handValue.value,
            soft_ace: handValue.soft,
          },
        ],
        current_hand: 0,
        total_bet: bet,
        has_acted: isBlackjack,
      };
    });

    const { cards: dealerCards, remaining: finalDeck } = dealCards(
      currentDeck,
      2,
    );

    let firstPlayer = 0;
    while (firstPlayer < players.length && players[firstPlayer].has_acted) {
      firstPlayer++;
    }

    let newState: BlackjackGameState = {
      type: "blackjack",
      phase: firstPlayer >= players.length ? "dealer_turn" : "playing",
      deck: finalDeck,
      dealer_cards: dealerCards,
      dealer_visible_cards: [dealerCards[0]],
      players,
      current_player: firstPlayer >= players.length ? -1 : firstPlayer,
      min_bet: minBet,
    };

    // If all players had blackjack, run dealer turn immediately
    if (newState.phase === "dealer_turn") {
      newState = runDealerTurn(newState);
    }

    // Mark old game as finished and create new one
    await supabase
      .from("games")
      .update({ finished_at: new Date().toISOString() })
      .eq("id", currentGame.id);

    const { error } = await supabase
      .from("games")
      .insert({ room_id: currentRoom.id, game_state: newState })
      .select()
      .single();

    if (error) {
      toast.error("Failed to deal next round");
      return false;
    }

    // Update chips if game finished immediately
    if (newState.phase === "finished" && newState.results) {
      await updateBlackjackChips(newState.results, currentRoom.id);
    }

    toast.success("New round dealt!");
    return true;
  };

  const dealNextHand = async (): Promise<boolean> => {
    if (!user || !currentRoom || !currentGame) return false;

    try {
      const oldState = currentGame.game_state as PokerGameState;
      const minBet = currentRoom.min_bet || 10;
      const smallBlind = Math.floor(minBet / 2);
      const bigBlind = minBet;

      // Use chip counts from the finished hand, filter out busted players
      const activePlayers = oldState.players.filter((p) => p.chip_count > 0);
      if (activePlayers.length < 2) {
        toast.error("Not enough players with chips to continue");
        return false;
      }

      // Rotate dealer position
      const newDealerPos =
        (oldState.dealer_position + 1) % activePlayers.length;

      const deck = shuffleDeck(createDeck());
      const players = activePlayers.map((p) => ({
        user_id: p.user_id,
        seat_index: p.seat_index,
        cards: [] as Card[],
        chip_count: p.chip_count,
        current_bet: 0,
        has_acted: false,
        has_folded: false,
        is_all_in: false,
      }));

      // Deal hole cards
      let currentDeck = deck;
      for (let round = 0; round < 2; round++) {
        for (const player of players) {
          const { cards, remaining } = dealCards(currentDeck, 1);
          player.cards.push(cards[0]);
          currentDeck = remaining;
        }
      }

      // Post blinds
      const sbIndex = (newDealerPos + 1) % players.length;
      const bbIndex = (newDealerPos + 2) % players.length;

      const sbAmount = Math.min(smallBlind, players[sbIndex].chip_count);
      players[sbIndex].current_bet = sbAmount;
      players[sbIndex].chip_count -= sbAmount;

      const bbAmount = Math.min(bigBlind, players[bbIndex].chip_count);
      players[bbIndex].current_bet = bbAmount;
      players[bbIndex].chip_count -= bbAmount;

      const firstToAct =
        players.length === 2 ? sbIndex : (newDealerPos + 3) % players.length;

      const newState: PokerGameState = {
        type: "poker",
        phase: "preflop",
        deck: currentDeck,
        community_cards: [],
        pot: sbAmount + bbAmount,
        current_bet: bbAmount,
        dealer_position: newDealerPos,
        current_player: firstToAct,
        small_blind: smallBlind,
        big_blind: bigBlind,
        players,
      };

      // Mark old game as finished and create new one
      await supabase
        .from("games")
        .update({ finished_at: new Date().toISOString() })
        .eq("id", currentGame.id);

      const { error } = await supabase
        .from("games")
        .insert({ room_id: currentRoom.id, game_state: newState })
        .select()
        .single();

      if (error) {
        toast.error("Failed to deal next hand");
        return false;
      }

      toast.success("New hand dealt!");
      return true;
    } catch (error) {
      console.error("Error dealing next hand:", error);
      toast.error("Failed to deal next hand");
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
    makeBlackjackMove,
    dealNextHand,
    dealNextBlackjackRound,
    forceFoldCurrentPlayer,
  };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
};
