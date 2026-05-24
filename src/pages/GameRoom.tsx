import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Users,
  Settings,
  Copy,
  UserPlus,
  Play,
  Crown,
  LogOut,
} from "lucide-react";
import { useGame } from "../contexts/GameContext";
import { useAuth } from "../contexts/AuthContext";
import GameTable from "../components/GameTable";
import BlackjackGameView from "../components/BlackjackGameView";
import PlayerAvatar from "../components/PlayerAvatar";
import PlayerTooltip from "../components/PlayerTooltip";
import toast from "react-hot-toast";

const GameRoom: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const {
    currentRoom,
    roomPlayers,
    currentGame,
    fetchRoomDetails,
    leaveRoom,
    toggleReady,
    startGame,
    makeMove,
    makeBlackjackMove,
    dealNextHand,
    dealNextBlackjackRound,
    forceFoldCurrentPlayer,
    loading,
  } = useGame();

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [loadingTimeout, setLoadingTimeout] = useState(false);
  const [raiseAmount, setRaiseAmount] = useState(0);

  // Cache player names so they persist even after a player leaves the room
  const playerNameCacheRef = useRef<Record<string, string>>({});

  // Update cache whenever roomPlayers changes
  useEffect(() => {
    roomPlayers.forEach((p: any) => {
      if (p.user?.display_name) {
        playerNameCacheRef.current[p.user_id] = p.user.display_name;
      }
    });
  }, [roomPlayers]);

  useEffect(() => {
    if (roomId) {
      fetchRoomDetails(roomId);
      // Set a timeout for loading
      const timer = setTimeout(() => {
        if (loading) {
          setLoadingTimeout(true);
        }
      }, 10000);
      // Fallback poll every 10s in case realtime drops
      const poll = setInterval(() => {
        fetchRoomDetails(roomId);
      }, 10000);
      return () => {
        clearTimeout(timer);
        clearInterval(poll);
      };
    }
  }, [roomId]); // Removed loading from dependency array to prevent loops

  const handleLeaveRoom = async () => {
    if (roomId && (await leaveRoom(roomId))) {
      navigate("/dashboard");
    }
  };

  const handleCopyInvite = () => {
    if (currentRoom?.invite_code) {
      navigator.clipboard.writeText(currentRoom.invite_code);
      toast.success("Invite code copied to clipboard!");
    }
  };

  const handleStartGame = async () => {
    console.log("GameRoom: Start Game button clicked");
    console.log("GameRoom: roomId:", roomId);
    console.log("GameRoom: isHost:", isHost);
    console.log("GameRoom: allPlayersReady:", allPlayersReady);

    if (roomId) {
      const result = await startGame(roomId);
      console.log("GameRoom: Start game result:", result);
      if (result) {
        console.log(
          "GameRoom: Game started successfully, real-time should update UI",
        );
        // Game started, the real-time subscription will update the UI
      }
    } else {
      console.log("GameRoom: No roomId available");
    }
  };

  const isHost = user?.id === currentRoom?.host_user_id;
  const currentPlayer = roomPlayers.find((p) => p.user_id === user?.id);
  const minPlayersNeeded = currentRoom?.game_type === "blackjack" ? 1 : 2;
  const allPlayersReady =
    roomPlayers.length >= minPlayersNeeded &&
    roomPlayers.every((p) => p.is_ready);

  if (!roomId) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">
            Room ID missing
          </h1>
          <button
            onClick={() => navigate("/dashboard")}
            className="px-6 py-3 bg-yellow-600 text-black rounded-lg font-semibold hover:bg-yellow-500 transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (loading && !currentRoom) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-yellow-400 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-white mb-2">
            Loading room...
          </h2>
          <p className="text-gray-400">
            Please wait while we fetch room details
          </p>
        </div>
      </div>
    );
  }

  if (!currentRoom) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Room not found</h1>
          <p className="text-gray-400 mb-4">
            The room you're looking for doesn't exist or you don't have access
            to it.
          </p>
          <button
            onClick={() => navigate("/dashboard")}
            className="px-6 py-3 bg-yellow-600 text-black rounded-lg font-semibold hover:bg-yellow-500 transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 p-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate("/dashboard")}
              className="p-2 text-gray-400 hover:text-white transition-colors"
              title="Back to Dashboard"
              aria-label="Back to Dashboard"
            >
              <ArrowLeft className="h-6 w-6" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-white">
                {currentRoom.name}
              </h1>
              <div className="flex items-center space-x-4 text-sm text-gray-400">
                <span className="capitalize">{currentRoom.game_type}</span>
                <span>•</span>
                <span className="flex items-center">
                  <Users className="h-4 w-4 mr-1" />
                  {roomPlayers.length}/{currentRoom.max_players}
                </span>
                <span>•</span>
                <span>Min bet: {currentRoom.min_bet} chips</span>
                {currentRoom.is_private && (
                  <>
                    <span>•</span>
                    <span className="text-yellow-400">Private</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {currentRoom.is_private && (
              <button
                onClick={() => setShowInviteModal(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors"
              >
                <UserPlus className="h-4 w-4" />
                <span>Invite</span>
              </button>
            )}

            <button
              onClick={handleLeaveRoom}
              className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-500 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              <span>Leave</span>
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 p-6">
        {currentRoom.status === "waiting" ? (
          // Lobby view
          <div className="max-w-6xl mx-auto grid lg:grid-cols-3 gap-8">
            {/* Game Table Preview */}
            <div className="lg:col-span-2">
              <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 h-96">
                <h2 className="text-xl font-bold text-white mb-6 text-center">
                  {currentRoom.game_type === "poker"
                    ? "🎰 Poker Table"
                    : "🃏 Blackjack Table"}
                </h2>
                <GameTable
                  players={roomPlayers}
                  gameType={currentRoom.game_type}
                />
              </div>
            </div>

            {/* Lobby Panel */}
            <div className="space-y-6">
              {/* Players List */}
              <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6">
                <h3 className="text-lg font-bold text-white mb-4">
                  Players ({roomPlayers.length}/{currentRoom.max_players})
                </h3>
                <div className="space-y-3">
                  {roomPlayers.map((player) => (
                    <div
                      key={player.id}
                      className="flex items-center justify-between p-3 bg-gray-700 rounded-lg"
                    >
                      <div className="flex items-center space-x-3">
                        <PlayerTooltip userId={player.user_id}>
                          <PlayerAvatar
                            userId={player.user_id}
                            avatarUrl={player.user.avatar_url}
                            displayName={player.user.display_name}
                            size="md"
                            showTooltip={false}
                          />
                        </PlayerTooltip>
                        <div>
                          <p className="text-white font-medium">
                            {player.user.display_name}
                          </p>
                          <p className="text-gray-400 text-xs">
                            {player.chip_count} chips • Seat{" "}
                            {player.seat_index + 1}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        {player.user_id === currentRoom.host_user_id && (
                          <Crown className="h-4 w-4 text-yellow-400" />
                        )}
                        <div
                          className={`w-3 h-3 rounded-full ${
                            player.is_ready ? "bg-green-400" : "bg-gray-500"
                          }`}
                        ></div>
                      </div>
                    </div>
                  ))}

                  {/* Empty slots */}
                  {Array.from(
                    { length: currentRoom.max_players - roomPlayers.length },
                    (_, i) => (
                      <div
                        key={`empty-${i}`}
                        className="p-3 border-2 border-dashed border-gray-600 rounded-lg text-center"
                      >
                        <span className="text-gray-500 text-sm">
                          Waiting for player...
                        </span>
                      </div>
                    ),
                  )}
                </div>
              </div>

              {/* Game Controls */}
              <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6">
                <h3 className="text-lg font-bold text-white mb-4">
                  Game Controls
                </h3>

                <div className="space-y-4">
                  {/* Ready button */}
                  {currentPlayer && (
                    <button
                      onClick={async () => {
                        console.log("GameRoom: Ready button clicked");
                        console.log("GameRoom: Current player:", currentPlayer);
                        const result = await toggleReady();
                        console.log("GameRoom: Toggle ready result:", result);
                      }}
                      disabled={loading}
                      className={`w-full py-3 rounded-lg font-semibold transition-colors ${
                        currentPlayer.is_ready
                          ? "bg-green-600 text-white hover:bg-green-500"
                          : "bg-yellow-600 text-black hover:bg-yellow-500"
                      }`}
                    >
                      {currentPlayer.is_ready ? "Ready!" : "Mark as Ready"}
                    </button>
                  )}

                  {/* Start game button (host only) */}
                  {isHost && (
                    <button
                      onClick={handleStartGame}
                      disabled={!allPlayersReady || loading}
                      className="w-full py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Play className="h-4 w-4 inline mr-2" />
                      Start Game
                    </button>
                  )}

                  {!allPlayersReady && (
                    <p className="text-center text-gray-400 text-sm">
                      {roomPlayers.length < minPlayersNeeded
                        ? `Need at least ${minPlayersNeeded} player${minPlayersNeeded > 1 ? "s" : ""} to start`
                        : "All players must be ready to start"}
                    </p>
                  )}
                </div>
              </div>

              {/* Room Info */}
              <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6">
                <h3 className="text-lg font-bold text-white mb-4">
                  Room Information
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Game Type:</span>
                    <span className="text-white capitalize">
                      {currentRoom.game_type}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Min Bet:</span>
                    <span className="text-yellow-400">
                      {currentRoom.min_bet} chips
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Created:</span>
                    <span className="text-white">
                      {new Date(currentRoom.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  {currentRoom.invite_code && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Invite Code:</span>
                      <button
                        onClick={handleCopyInvite}
                        className="text-yellow-400 hover:text-yellow-300 font-mono"
                      >
                        {currentRoom.invite_code}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : currentRoom.game_type === "blackjack" ? (
          // Blackjack game view
          <BlackjackGameView
            currentGame={currentGame}
            currentRoom={currentRoom}
            user={user}
            makeBlackjackMove={makeBlackjackMove}
            dealNextBlackjackRound={dealNextBlackjackRound}
            isHost={isHost}
            roomPlayers={roomPlayers}
            playerNameCache={playerNameCacheRef.current}
          />
        ) : (
          // Poker active game view
          <ActiveGameView
            currentGame={currentGame}
            currentRoom={currentRoom}
            user={user}
            makeMove={makeMove}
            dealNextHand={dealNextHand}
            forceFoldCurrentPlayer={forceFoldCurrentPlayer}
            isHost={isHost}
            raiseAmount={raiseAmount}
            setRaiseAmount={setRaiseAmount}
            roomPlayers={roomPlayers}
            playerNameCache={playerNameCacheRef.current}
          />
        )}
      </div>

      {/* Invite Modal */}
      <AnimatePresence>
        {showInviteModal && currentRoom?.invite_code && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.3 }}
              className="bg-gray-800 border border-gray-700 rounded-2xl p-6 w-full max-w-md"
            >
              <h3 className="text-xl font-bold text-white mb-4">
                Invite Players
              </h3>

              <div className="space-y-4">
                <div>
                  <p className="text-gray-400 text-sm mb-2">
                    Share this invite code:
                  </p>
                  <div className="flex items-center space-x-2">
                    <div className="flex-1 p-3 bg-gray-700 border border-gray-600 rounded-lg">
                      <code className="text-yellow-400 font-mono text-lg">
                        {currentRoom.invite_code}
                      </code>
                    </div>
                    <button
                      onClick={handleCopyInvite}
                      className="p-3 bg-yellow-600 text-black rounded-lg hover:bg-yellow-500 transition-colors"
                      title="Copy invite code"
                      aria-label="Copy invite code"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="text-center">
                  <p className="text-gray-400 text-sm">
                    Or share this direct link:
                  </p>
                  <div className="mt-2 p-2 bg-gray-700 rounded-lg">
                    <code className="text-blue-400 text-sm break-all">
                      {window.location.origin}/room/{roomId}?invite=
                      {currentRoom.invite_code}
                    </code>
                  </div>
                </div>

                <button
                  onClick={() => setShowInviteModal(false)}
                  className="w-full py-3 bg-gray-600 text-white rounded-lg font-semibold hover:bg-gray-500 transition-colors"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Loading Timeout Modal */}
        {loadingTimeout && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.3 }}
              className="bg-gray-800 border border-yellow-600 rounded-xl p-8 text-center shadow-2xl w-full max-w-md"
            >
              <h2 className="text-2xl font-bold text-white mb-4">
                Loading is taking too long
              </h2>
              <p className="text-gray-300 mb-6">
                Would you like to try again or go back to dashboard?
              </p>
              <div className="flex justify-center space-x-4">
                <button
                  className="px-6 py-3 bg-yellow-600 text-black rounded-lg font-semibold hover:bg-yellow-500 transition-colors"
                  onClick={() => {
                    setLoadingTimeout(false);
                    if (roomId) fetchRoomDetails(roomId);
                  }}
                >
                  Try Again
                </button>
                <button
                  className="px-6 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-500 transition-colors"
                  onClick={async () => {
                    await signOut();
                    navigate("/dashboard");
                  }}
                >
                  Go Back
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ─── Poker Table Active Game View ──────────────────────────────────────────────
// Full visual poker table with animations for dealing, chips, and player seats

// Player seat positions around an oval table (percentages)
// Positions arranged so "me" is always at the bottom center
const SEAT_POSITIONS: { top: string; left: string }[] = [
  { top: "78%", left: "50%" }, // Seat 0 - bottom center (ME)
  { top: "70%", left: "15%" }, // Seat 1 - bottom left
  { top: "35%", left: "5%" }, // Seat 2 - mid left
  { top: "8%", left: "20%" }, // Seat 3 - top left
  { top: "5%", left: "50%" }, // Seat 4 - top center
  { top: "8%", left: "80%" }, // Seat 5 - top right
  { top: "35%", left: "95%" }, // Seat 6 - mid right
  { top: "70%", left: "85%" }, // Seat 7 - bottom right
];

const ActiveGameView: React.FC<{
  currentGame: any;
  currentRoom: any;
  user: any;
  makeMove: (
    action: "fold" | "call" | "raise" | "check",
    amount?: number,
  ) => Promise<boolean>;
  dealNextHand: () => Promise<boolean>;
  forceFoldCurrentPlayer: () => Promise<boolean>;
  isHost: boolean;
  raiseAmount: number;
  setRaiseAmount: (n: number) => void;
  roomPlayers: any[];
  playerNameCache: Record<string, string>;
}> = ({
  currentGame,
  currentRoom,
  user,
  makeMove,
  dealNextHand,
  forceFoldCurrentPlayer,
  isHost,
  raiseAmount,
  setRaiseAmount,
  roomPlayers,
  playerNameCache,
}) => {
  const [dealingCards, setDealingCards] = useState(false);
  const [chipsAnimating, setChipsAnimating] = useState(false);
  const prevPhaseRef = useRef<string>("");

  // Turn timer - 30 seconds per turn
  const TURN_TIME = 30;
  const [timeLeft, setTimeLeft] = useState(TURN_TIME);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const gameState = currentGame?.game_state as any;
  const myPlayerIndex =
    gameState?.players?.findIndex((p: any) => p.user_id === user?.id) ?? -1;
  const isMyTurn =
    gameState &&
    gameState.current_player === myPlayerIndex &&
    gameState.phase !== "finished" &&
    gameState.phase !== "showdown";

  useEffect(() => {
    if (!gameState) return;
    setTimeLeft(TURN_TIME);
    if (timerRef.current) clearInterval(timerRef.current);

    if (gameState.phase !== "finished" && gameState.phase !== "showdown") {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);
            // Auto-fold: if it's my turn, I fold myself. If it's opponent's turn, force-fold them.
            if (isMyTurn) {
              makeMove("fold");
            } else {
              forceFoldCurrentPlayer();
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [gameState?.current_player, gameState?.phase]);

  // Trigger dealing animation when phase changes
  useEffect(() => {
    if (!gameState) return;
    if (prevPhaseRef.current !== gameState.phase) {
      if (
        gameState.phase === "preflop" ||
        gameState.phase === "flop" ||
        gameState.phase === "turn" ||
        gameState.phase === "river"
      ) {
        setDealingCards(true);
        setTimeout(() => setDealingCards(false), 800);
      }
      if (gameState.phase === "preflop") {
        setChipsAnimating(true);
        setTimeout(() => setChipsAnimating(false), 600);
      }
      prevPhaseRef.current = gameState.phase;
    }
  }, [gameState?.phase]);

  if (!currentGame?.game_state || !gameState) {
    return (
      <div className="max-w-4xl mx-auto text-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400 mx-auto mb-4"></div>
        <p className="text-gray-400">Loading game state...</p>
      </div>
    );
  }

  const myPlayer = myPlayerIndex >= 0 ? gameState.players[myPlayerIndex] : null;
  const canCheck =
    isMyTurn &&
    (gameState.current_bet === 0 ||
      (myPlayer && myPlayer.current_bet === gameState.current_bet));
  const callAmount = myPlayer
    ? gameState.current_bet - myPlayer.current_bet
    : 0;
  const minRaise = gameState.current_bet * 2 || gameState.big_blind * 2;

  // Reorder players so current user is always at seat 0 (bottom center)
  const reorderedPlayers = (() => {
    if (myPlayerIndex < 0) return gameState.players || [];
    const players = [...(gameState.players || [])];
    const before = players.splice(0, myPlayerIndex);
    return [...players, ...before];
  })();

  // Map original index to visual seat index
  const getVisualSeatIndex = (originalIndex: number) => {
    if (myPlayerIndex < 0) return originalIndex;
    return (
      (originalIndex - myPlayerIndex + reorderedPlayers.length) %
      reorderedPlayers.length
    );
  };

  const getPlayerDisplayName = (userId: string) => {
    const rp = roomPlayers.find((p: any) => p.user_id === userId);
    if (rp?.user?.display_name) return rp.user.display_name;
    // Fallback to cached name (persists after player leaves)
    return playerNameCache[userId] || userId.slice(0, 8);
  };

  const suitSymbol: Record<string, string> = {
    hearts: "♥",
    diamonds: "♦",
    clubs: "♣",
    spades: "♠",
  };
  const suitColor: Record<string, string> = {
    hearts: "text-red-500",
    diamonds: "text-red-500",
    clubs: "text-gray-900",
    spades: "text-gray-900",
  };

  const timerPercent = (timeLeft / TURN_TIME) * 100;
  const timerColor =
    timeLeft > 15
      ? "bg-green-500"
      : timeLeft > 7
        ? "bg-yellow-500"
        : "bg-red-500";

  const dealerPos = gameState.dealer_position ?? 0;
  const totalPlayers = reorderedPlayers.length;

  // Determine SB/BB positions
  const getSBIndex = () => {
    if (totalPlayers === 2) return dealerPos;
    return (dealerPos + 1) % totalPlayers;
  };
  const getBBIndex = () => {
    if (totalPlayers === 2) return (dealerPos + 1) % totalPlayers;
    return (dealerPos + 2) % totalPlayers;
  };

  return (
    <div className="w-full max-w-7xl mx-auto">
      {/* Top Info Bar */}
      <div className="flex items-center justify-between bg-gray-800/80 backdrop-blur border border-gray-700 rounded-xl p-3 mb-4">
        <div className="flex items-center space-x-4">
          <span className="text-gray-400 text-xs">
            Phase:{" "}
            <span className="text-yellow-400 font-bold uppercase">
              {gameState.phase}
            </span>
          </span>
          <span className="text-gray-400 text-xs">
            Blinds:{" "}
            <span className="text-white font-semibold">
              {gameState.small_blind}/{gameState.big_blind}
            </span>
          </span>
        </div>
        <div className="flex items-center gap-3">
          {isMyTurn && (
            <motion.span
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
              className="bg-yellow-500 text-black px-3 py-1 rounded-full text-xs font-bold"
            >
              YOUR TURN
            </motion.span>
          )}
          {/* Timer */}
          {gameState.phase !== "finished" && gameState.phase !== "showdown" && (
            <div className="flex items-center gap-2">
              <div className="w-20 h-2 bg-gray-700 rounded-full overflow-hidden">
                <motion.div
                  className={`h-full ${timerColor} rounded-full`}
                  animate={{ width: `${timerPercent}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
              <span
                className={`text-xs font-bold ${timeLeft <= 7 ? "text-red-400" : "text-gray-300"}`}
              >
                {timeLeft}s
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ─── POKER TABLE ─────────────────────────────────────── */}
      <div className="relative w-full" style={{ paddingBottom: "60%" }}>
        <div className="absolute inset-0">
          {/* Table Surface */}
          <div className="absolute inset-[12%] rounded-[50%] bg-gradient-to-b from-green-800 via-green-700 to-green-900 border-[12px] border-yellow-800 shadow-[0_0_60px_rgba(0,0,0,0.8),inset_0_0_80px_rgba(0,0,0,0.3)]">
            {/* Felt texture */}
            <div className="absolute inset-0 rounded-[50%] opacity-30 bg-[radial-gradient(ellipse_at_center,_transparent_0%,_rgba(0,0,0,0.3)_100%)]" />

            {/* Table rail */}
            <div className="absolute inset-[-14px] rounded-[50%] border-[6px] border-yellow-900/60" />

            {/* ─── POT (Center of table) ─── */}
            <div className="absolute top-[30%] left-1/2 -translate-x-1/2 z-10">
              <AnimatePresence>
                {gameState.pot > 0 && (
                  <motion.div
                    initial={{ scale: 0, y: 20 }}
                    animate={{ scale: 1, y: 0 }}
                    className="flex flex-col items-center"
                  >
                    {/* Chip stack visual */}
                    <div className="relative mb-1">
                      {Array.from(
                        { length: Math.min(Math.ceil(gameState.pot / 50), 6) },
                        (_, i) => (
                          <motion.div
                            key={i}
                            initial={chipsAnimating ? { scale: 0, y: -30 } : {}}
                            animate={{ scale: 1, y: 0 }}
                            transition={{ delay: i * 0.08, type: "spring" }}
                            className="w-8 h-8 rounded-full border-[3px] border-yellow-600 bg-gradient-to-b from-yellow-400 to-yellow-600 absolute shadow-md"
                            style={{ bottom: i * 3, left: i % 2 === 0 ? 0 : 4 }}
                          />
                        ),
                      )}
                      <div className="w-8 h-8 opacity-0" />
                    </div>
                    <span className="bg-black/70 text-yellow-300 text-xs font-bold px-2 py-0.5 rounded-full">
                      {gameState.pot}
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* ─── COMMUNITY CARDS (Center) ─── */}
            <div className="absolute top-[45%] left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
              <div className="flex gap-1.5">
                {gameState.community_cards &&
                gameState.community_cards.length > 0
                  ? gameState.community_cards.map((card: any, i: number) => (
                      <motion.div
                        key={card.id || `cc-${i}`}
                        initial={{
                          opacity: 0,
                          y: -40,
                          rotateY: 180,
                          scale: 0.5,
                        }}
                        animate={{ opacity: 1, y: 0, rotateY: 0, scale: 1 }}
                        transition={{
                          delay: i * 0.12,
                          duration: 0.4,
                          type: "spring",
                          stiffness: 200,
                        }}
                        className="w-11 h-16 sm:w-14 sm:h-20 bg-white rounded-md border border-gray-300 flex flex-col items-center justify-center shadow-lg"
                      >
                        <span
                          className={`text-sm sm:text-lg font-bold ${suitColor[card.suit]}`}
                        >
                          {card.rank}
                        </span>
                        <span
                          className={`text-base sm:text-xl ${suitColor[card.suit]}`}
                        >
                          {suitSymbol[card.suit]}
                        </span>
                      </motion.div>
                    ))
                  : Array.from({ length: 5 }, (_, i) => (
                      <div
                        key={`empty-cc-${i}`}
                        className="w-11 h-16 sm:w-14 sm:h-20 rounded-md border border-green-600/40 bg-green-800/30 flex items-center justify-center"
                      >
                        <span className="text-green-600/40 text-xs">•</span>
                      </div>
                    ))}
              </div>
            </div>

            {/* ─── DEALER CHIP (on table near dealer) ─── */}
            {(() => {
              const dealerSeat = getVisualSeatIndex(dealerPos);
              const pos = SEAT_POSITIONS[dealerSeat % SEAT_POSITIONS.length];
              return (
                <motion.div
                  key="dealer-button"
                  className="absolute z-20"
                  style={{
                    top: `calc(${pos.top} - 2%)`,
                    left: pos.left,
                    transform: "translate(-50%, -50%)",
                  }}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <div className="w-6 h-6 rounded-full bg-white border-2 border-gray-800 flex items-center justify-center shadow-lg">
                    <span className="text-[10px] font-black text-gray-800">
                      D
                    </span>
                  </div>
                </motion.div>
              );
            })()}
          </div>

          {/* ─── PLAYER SEATS ─── */}
          {reorderedPlayers.map((player: any, visualIdx: number) => {
            const originalIdx = (visualIdx + myPlayerIndex) % totalPlayers;
            const isMe = player.user_id === user?.id;
            const isActive =
              gameState.current_player === originalIdx &&
              gameState.phase !== "finished" &&
              gameState.phase !== "showdown";
            const showCards =
              isMe ||
              gameState.phase === "showdown" ||
              gameState.phase === "finished";
            const isSB = originalIdx === getSBIndex();
            const isBB = originalIdx === getBBIndex();
            const isDealer = originalIdx === dealerPos;
            const pos = SEAT_POSITIONS[visualIdx % SEAT_POSITIONS.length];

            return (
              <motion.div
                key={player.user_id}
                className="absolute z-10"
                style={{
                  top: pos.top,
                  left: pos.left,
                  transform: "translate(-50%, -50%)",
                }}
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: visualIdx * 0.08 }}
              >
                {/* Player bet chips (between player and center) */}
                {player.current_bet > 0 && (
                  <motion.div
                    className="absolute -top-6 left-1/2 -translate-x-1/2"
                    initial={{ scale: 0, y: 10 }}
                    animate={{ scale: 1, y: 0 }}
                    transition={{ type: "spring", stiffness: 300 }}
                  >
                    <div className="flex items-center gap-1">
                      <div className="w-4 h-4 rounded-full bg-gradient-to-b from-yellow-400 to-yellow-600 border border-yellow-700 shadow-sm" />
                      <span className="text-[10px] text-yellow-300 font-bold bg-black/60 px-1 rounded">
                        {player.current_bet}
                      </span>
                    </div>
                  </motion.div>
                )}

                {/* Player card */}
                <div
                  className={`relative rounded-xl p-2 min-w-[100px] sm:min-w-[120px] transition-all duration-300 ${
                    isActive
                      ? "bg-gray-800/95 border-2 border-yellow-400 shadow-[0_0_20px_rgba(250,204,21,0.4)]"
                      : player.has_folded
                        ? "bg-gray-900/80 border border-gray-700 opacity-40"
                        : isMe
                          ? "bg-gray-800/95 border-2 border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.3)]"
                          : "bg-gray-800/90 border border-gray-600"
                  }`}
                >
                  {/* Active turn glow ring */}
                  {isActive && (
                    <motion.div
                      className="absolute inset-0 rounded-xl border-2 border-yellow-400"
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    />
                  )}

                  {/* Timer bar for active player */}
                  {isActive && (
                    <div className="absolute -bottom-1 left-2 right-2 h-1 bg-gray-700 rounded-full overflow-hidden">
                      <motion.div
                        className={`h-full ${timerColor} rounded-full`}
                        animate={{ width: `${timerPercent}%` }}
                        transition={{ duration: 0.5 }}
                      />
                    </div>
                  )}

                  {/* SB/BB/D badges */}
                  <div className="absolute -top-2 -right-2 flex gap-0.5">
                    {isSB && (
                      <span className="w-5 h-5 rounded-full bg-blue-600 border border-blue-400 flex items-center justify-center text-[8px] font-bold text-white">
                        SB
                      </span>
                    )}
                    {isBB && (
                      <span className="w-5 h-5 rounded-full bg-orange-600 border border-orange-400 flex items-center justify-center text-[8px] font-bold text-white">
                        BB
                      </span>
                    )}
                  </div>

                  {/* Avatar + Name */}
                  <div className="flex items-center gap-2 mb-1.5">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                        isMe
                          ? "bg-gradient-to-br from-blue-400 to-blue-600 text-white"
                          : "bg-gradient-to-br from-gray-500 to-gray-700 text-gray-200"
                      }`}
                    >
                      {isMe
                        ? "U"
                        : getPlayerDisplayName(player.user_id)
                            .charAt(0)
                            .toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-semibold text-white truncate">
                        {isMe ? "You" : getPlayerDisplayName(player.user_id)}
                      </p>
                      <p className="text-[10px] text-yellow-300 font-medium">
                        {player.chip_count} chips
                      </p>
                    </div>
                  </div>

                  {/* Cards */}
                  <div className="flex gap-0.5 justify-center">
                    {player.cards && player.cards.length > 0
                      ? showCards
                        ? player.cards.map((card: any, ci: number) => (
                            <motion.div
                              key={ci}
                              initial={{
                                x: 0,
                                y: -60,
                                opacity: 0,
                                rotateY: 180,
                              }}
                              animate={{ x: 0, y: 0, opacity: 1, rotateY: 0 }}
                              transition={{
                                delay: ci * 0.15 + visualIdx * 0.05,
                                duration: 0.5,
                                type: "spring",
                              }}
                              className={`w-9 h-13 sm:w-10 sm:h-14 bg-white rounded border ${
                                isMe
                                  ? "border-blue-400 shadow-md"
                                  : "border-gray-300"
                              } flex flex-col items-center justify-center`}
                            >
                              <span
                                className={`text-[10px] sm:text-xs font-bold ${suitColor[card.suit]}`}
                              >
                                {card.rank}
                              </span>
                              <span
                                className={`text-sm sm:text-base ${suitColor[card.suit]}`}
                              >
                                {suitSymbol[card.suit]}
                              </span>
                            </motion.div>
                          ))
                        : player.cards.map((_: any, ci: number) => (
                            <motion.div
                              key={ci}
                              initial={{ x: 0, y: -60, opacity: 0 }}
                              animate={{ x: 0, y: 0, opacity: 1 }}
                              transition={{
                                delay: ci * 0.15 + visualIdx * 0.05,
                                duration: 0.4,
                                type: "spring",
                              }}
                              className="w-9 h-13 sm:w-10 sm:h-14 bg-gradient-to-br from-blue-800 to-blue-600 rounded border-2 border-blue-500 flex items-center justify-center shadow-md"
                            >
                              <div className="w-5 h-5 rounded-full border border-blue-400/50 bg-blue-700/50" />
                            </motion.div>
                          ))
                      : null}
                  </div>

                  {/* Status badges */}
                  {player.has_folded && (
                    <div className="text-center mt-1">
                      <span className="text-[9px] bg-red-900/80 text-red-300 px-1.5 py-0.5 rounded font-bold">
                        FOLDED
                      </span>
                    </div>
                  )}
                  {player.is_all_in && !player.has_folded && (
                    <div className="text-center mt-1">
                      <motion.span
                        animate={{ opacity: [1, 0.5, 1] }}
                        transition={{ duration: 1, repeat: Infinity }}
                        className="text-[9px] bg-purple-900/80 text-purple-300 px-1.5 py-0.5 rounded font-bold"
                      >
                        ALL IN
                      </motion.span>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* ─── ACTION CONTROLS (Bottom Panel) ─── */}
      {isMyTurn && myPlayer && !myPlayer.has_folded && (
        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="mt-4 bg-gray-800/95 backdrop-blur border border-yellow-600/50 rounded-xl p-4"
        >
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => makeMove("fold")}
              className="px-5 py-2.5 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-500 transition-all hover:scale-105 active:scale-95 shadow-lg"
            >
              Fold
            </button>

            {canCheck ? (
              <button
                onClick={() => makeMove("check")}
                className="px-5 py-2.5 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-500 transition-all hover:scale-105 active:scale-95 shadow-lg"
              >
                Check
              </button>
            ) : (
              <button
                onClick={() => makeMove("call")}
                className="px-5 py-2.5 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-500 transition-all hover:scale-105 active:scale-95 shadow-lg"
              >
                Call {callAmount}
              </button>
            )}

            <div className="flex items-center gap-2">
              <input
                type="number"
                value={raiseAmount || minRaise}
                onChange={(e) =>
                  setRaiseAmount(parseInt(e.target.value) || minRaise)
                }
                min={minRaise}
                max={myPlayer.chip_count + myPlayer.current_bet}
                className="w-20 px-2 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white text-center text-sm"
              />
              <button
                onClick={() => makeMove("raise", raiseAmount || minRaise)}
                className="px-5 py-2.5 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-500 transition-all hover:scale-105 active:scale-95 shadow-lg"
              >
                Raise
              </button>
            </div>

            <button
              onClick={() =>
                makeMove("raise", myPlayer.chip_count + myPlayer.current_bet)
              }
              className="px-5 py-2.5 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-500 transition-all hover:scale-105 active:scale-95 shadow-lg"
            >
              All In ({myPlayer.chip_count})
            </button>
          </div>
        </motion.div>
      )}

      {/* Waiting indicator */}
      {!isMyTurn &&
        gameState.phase !== "finished" &&
        gameState.phase !== "showdown" &&
        myPlayer &&
        !myPlayer.has_folded && (
          <div className="mt-4 text-center">
            <p className="text-gray-500 text-sm">
              Waiting for{" "}
              <span className="text-yellow-400 font-semibold">
                {getPlayerDisplayName(
                  gameState.players[gameState.current_player]?.user_id,
                )}
              </span>
            </p>
          </div>
        )}

      {/* ─── GAME OVER OVERLAY ─── */}
      {(gameState.phase === "finished" || gameState.phase === "showdown") && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 space-y-4"
        >
          {/* Winner Banner */}
          {gameState.result && (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 200 }}
              className="bg-gradient-to-r from-yellow-900/60 via-yellow-700/40 to-yellow-900/60 border-2 border-yellow-500/70 rounded-xl p-5 text-center"
            >
              <motion.div
                animate={{ rotate: [0, -5, 5, -5, 0], scale: [1, 1.1, 1] }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="text-4xl mb-2"
              >
                🏆
              </motion.div>
              <h3 className="text-xl font-bold text-yellow-400 mb-1">
                {gameState.result.winners.length > 1 ? "Split Pot!" : "Winner!"}
              </h3>
              {gameState.result.winners.map((w: any) => (
                <div key={w.user_id} className="mb-2">
                  <p className="text-lg font-semibold text-white">
                    {w.user_id === user?.id
                      ? "🎉 You won!"
                      : `${getPlayerDisplayName(w.user_id)} wins!`}
                  </p>
                  <p className="text-yellow-300 text-sm">
                    with <span className="font-bold">{w.hand_description}</span>
                  </p>
                  <motion.p
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.5 }}
                    className="text-green-400 font-bold mt-1"
                  >
                    +{w.chips_won} chips
                  </motion.p>
                </div>
              ))}
            </motion.div>
          )}

          {/* Round Results */}
          <div className="bg-gray-800/90 border border-gray-700 rounded-xl p-4">
            <h4 className="text-xs text-gray-400 font-semibold mb-2 uppercase tracking-wide">
              Round Results
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {gameState.players?.map((p: any) => {
                const isWinner = gameState.result?.winners.some(
                  (w: any) => w.user_id === p.user_id,
                );
                const resultInfo = isWinner
                  ? gameState.result?.winners.find(
                      (w: any) => w.user_id === p.user_id,
                    )
                  : gameState.result?.losers.find(
                      (l: any) => l.user_id === p.user_id,
                    );

                return (
                  <motion.div
                    key={p.user_id}
                    initial={{ x: -10, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    className={`flex items-center justify-between p-2 rounded-lg ${
                      isWinner
                        ? "bg-yellow-900/30 border border-yellow-600/40"
                        : "bg-gray-700/40"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-base">
                        {isWinner ? "👑" : p.has_folded ? "🏳️" : "💀"}
                      </span>
                      <div>
                        <p
                          className={`text-sm font-semibold ${p.user_id === user?.id ? "text-blue-400" : "text-white"}`}
                        >
                          {p.user_id === user?.id
                            ? "You"
                            : getPlayerDisplayName(p.user_id)}
                        </p>
                        <p className="text-[10px] text-gray-400">
                          {resultInfo?.hand_description ||
                            (p.has_folded ? "Folded" : "—")}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p
                        className={`text-sm font-bold ${isWinner ? "text-green-400" : "text-gray-300"}`}
                      >
                        {p.chip_count}
                      </p>
                      {isWinner && resultInfo && (
                        <p className="text-green-400 text-[10px]">
                          +{resultInfo.chips_won}
                        </p>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Revealed Hands */}
          <div className="bg-gray-800/90 border border-gray-700 rounded-xl p-4">
            <h4 className="text-xs text-gray-400 font-semibold mb-2 uppercase tracking-wide">
              Revealed Hands
            </h4>
            <div className="flex flex-wrap gap-3 justify-center">
              {gameState.players
                ?.filter((p: any) => !p.has_folded)
                .map((p: any) => (
                  <div
                    key={p.user_id}
                    className="flex items-center gap-2 p-2 bg-gray-700/50 rounded-lg"
                  >
                    <span className="text-xs font-semibold text-gray-300">
                      {p.user_id === user?.id
                        ? "You"
                        : getPlayerDisplayName(p.user_id)}
                    </span>
                    <div className="flex gap-0.5">
                      {p.cards?.map((card: any, i: number) => (
                        <div
                          key={i}
                          className="w-8 h-12 bg-white rounded border border-gray-300 flex flex-col items-center justify-center"
                        >
                          <span
                            className={`text-[9px] font-bold ${suitColor[card.suit]}`}
                          >
                            {card.rank}
                          </span>
                          <span className={`text-xs ${suitColor[card.suit]}`}>
                            {suitSymbol[card.suit]}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* Deal Next Hand */}
          <div className="text-center">
            {isHost ? (
              <button
                onClick={() => dealNextHand()}
                className="px-8 py-3 bg-gradient-to-r from-yellow-600 to-yellow-500 text-black rounded-xl font-bold text-lg hover:from-yellow-500 hover:to-yellow-400 transition-all shadow-lg shadow-yellow-600/30 hover:scale-105 active:scale-95"
              >
                🃏 Deal Next Hand
              </button>
            ) : (
              <p className="text-gray-400 text-sm">
                Waiting for host to deal next hand...
              </p>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default GameRoom;
