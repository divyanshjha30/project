import React, { createContext, useContext, useEffect, useState } from "react";
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
    isPrivate: boolean
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
  const [lastFetchTime, setLastFetchTime] = useState(0);

  // Subscribe to real-time changes
  useEffect(() => {
    if (!user?.id) return;

    // Subscribe to room changes
    const roomsSubscription = supabase
      .channel("public:rooms")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "rooms",
        },
        (_payload) => {
          fetchRooms();
        }
      )
      .subscribe();

    // Subscribe to room players changes
    const playersSubscription = supabase
      .channel("public:room_players")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "room_players",
        },
        (_payload) => {
          if (currentRoom) {
            fetchRoomDetails(currentRoom.id);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(roomsSubscription);
      supabase.removeChannel(playersSubscription);
    };
  }, [user?.id, currentRoom?.id]); // Be more specific about dependencies

  const fetchRooms = async () => {
    // Prevent too frequent calls (minimum 1 second between calls)
    const now = Date.now();
    if (now - lastFetchTime < 1000) {
      return;
    }
    setLastFetchTime(now);

    try {
      const { data, error } = await supabase
        .from("rooms")
        .select(
          `
          *,
          users!rooms_host_user_id_fkey(display_name, username)
        `
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

  const fetchRoomDetails = async (roomId: string) => {
    try {
      console.log("Starting fetchRoomDetails for room:", roomId);
      setLoading(true);

      // Fetch room details
      const { data: roomData, error: roomError } = await supabase
        .from("rooms")
        .select("*")
        .eq("id", roomId)
        .single();

      if (roomError) {
        console.error("Error fetching room:", roomError);
        toast.error("Failed to load room details");
        setLoading(false);
        return;
      }

      console.log("Room data fetched successfully:", roomData);
      setCurrentRoom(roomData);

      // Fetch room players - with better error handling
      console.log("Fetching room players for room:", roomId);
      const { data: playersData, error: playersError } = await supabase
        .from("room_players")
        .select(
          `
          *,
          users(*)
        `
        )
        .eq("room_id", roomId)
        .order("seat_index");

      if (playersError) {
        console.error("Error fetching room players:", playersError);
        console.error(
          "RLS Error details:",
          playersError.details,
          playersError.hint
        );
        // Don't fail completely if players can't be loaded, just show empty
        setRoomPlayers([]);
        toast.error("Could not load players due to database policies");
      } else {
        console.log("Room players fetched successfully:", playersData);
        setRoomPlayers(
          playersData?.map((player) => ({
            ...player,
            user: player.users as User,
          })) || []
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
      toast.error("Failed to load room");
    } finally {
      console.log("fetchRoomDetails completed, setting loading to false");
      setLoading(false);
    }
  };

  const createRoom = async (
    name: string,
    gameType: "poker" | "blackjack",
    maxPlayers: number,
    minBet: number,
    isPrivate: boolean
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

      toast.success("Room created successfully!");
      await fetchRooms();
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
    inviteCode?: string
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

      const { error } = await supabase
        .from("room_players")
        .update({ is_ready: !currentPlayer.is_ready })
        .eq("room_id", currentRoom.id)
        .eq("user_id", user.id);

      if (error) {
        console.error("Error toggling ready:", error);
        toast.error("Failed to update ready status");
        return false;
      }

      return true;
    } catch (error) {
      console.error("Error toggling ready:", error);
      return false;
    }
  };

  const startGame = async (roomId: string): Promise<boolean> => {
    if (!user) return false;

    try {
      setLoading(true);

      // Call edge function to start the game
      const { error } = await supabase.functions.invoke("start-game", {
        body: { room_id: roomId },
      });

      if (error) {
        console.error("Error starting game:", error);
        toast.error("Failed to start game");
        return false;
      }

      toast.success("Game started!");
      return true;
    } catch (error) {
      console.error("Error starting game:", error);
      toast.error("Failed to start game");
      return false;
    } finally {
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
