import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  useCallback,
} from "react";
import { supabase } from "../lib/supabase";
import { Room, RoomPlayer, Game, User } from "../types";
import { useAuth } from "./AuthContext";
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

  const startGame = async (roomId: string): Promise<boolean> => {
    console.log("startGame called with roomId:", roomId);
    console.log("startGame: user exists?", !!user);

    if (!user) {
      console.log("startGame: No user, returning false");
      return false;
    }

    try {
      console.log("startGame: Setting loading to true");
      setLoading(true);

      // Check if enough players are ready
      console.log("startGame: Checking ready players...");
      const { data: readyPlayers, error: playersError } = await supabase
        .from("room_players")
        .select("*")
        .eq("room_id", roomId)
        .eq("is_ready", true);

      console.log("startGame: Ready players:", readyPlayers?.length || 0);

      if (playersError || !readyPlayers || readyPlayers.length < 2) {
        console.error("startGame: Not enough ready players");
        toast.error("Need at least 2 ready players to start");
        return false;
      }

      // Update room status to playing
      console.log("startGame: Updating room status to playing...");
      const { error: roomUpdateError } = await supabase
        .from("rooms")
        .update({
          status: "playing",
          started_at: new Date().toISOString(),
        })
        .eq("id", roomId)
        .eq("status", "waiting"); // Only update if still waiting

      if (roomUpdateError) {
        console.error("startGame: Error updating room:", roomUpdateError);
        toast.error("Failed to start game");
        return false;
      }

      // Create a basic game record
      console.log("startGame: Creating game record...");
      const basicGameState = {
        type: currentRoom?.game_type || "poker",
        phase: "preflop",
        pot: 0,
        current_player: 0,
        status: "active",
        players: readyPlayers.map((p) => ({
          user_id: p.user_id,
          seat_index: p.seat_index,
          chip_count: p.chip_count,
          current_bet: 0,
          has_acted: false,
          has_folded: false,
          is_all_in: false,
        })),
        created_at: new Date().toISOString(),
      };

      const { data: gameData, error: gameError } = await supabase
        .from("games")
        .insert({
          room_id: roomId,
          game_state: basicGameState,
        })
        .select()
        .single();

      if (gameError) {
        console.error("startGame: Error creating game:", gameError);
        toast.error("Failed to create game");
        return false;
      }

      console.log("startGame: Game started successfully!", gameData);
      toast.success("Game started!");
      return true;
    } catch (error) {
      console.error("Error starting game:", error);
      toast.error("Failed to start game");
      return false;
    } finally {
      console.log("startGame: Setting loading to false");
      setLoading(false);
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
  };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
};
