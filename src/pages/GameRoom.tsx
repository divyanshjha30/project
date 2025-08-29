import React, { useEffect, useState } from "react";
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
import Card from "../components/Card";
import ChipStack from "../components/ChipStack";
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
    loading,
  } = useGame();

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [loadingTimeout, setLoadingTimeout] = useState(false);

  useEffect(() => {
    if (roomId) {
      fetchRoomDetails(roomId);
      // Set a timeout for loading
      const timer = setTimeout(() => {
        if (loading) {
          setLoadingTimeout(true);
        }
      }, 10000);
      return () => clearTimeout(timer);
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
    if (roomId && (await startGame(roomId))) {
      // Game started, the real-time subscription will update the UI
    }
  };

  const isHost = user?.id === currentRoom?.host_user_id;
  const currentPlayer = roomPlayers.find((p) => p.user_id === user?.id);
  const allPlayersReady =
    roomPlayers.length >= 2 && roomPlayers.every((p) => p.is_ready);

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
                  {currentRoom.current_players}/{currentRoom.max_players}
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
                        <div className="w-10 h-10 bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center">
                          <span className="text-black font-bold text-sm">
                            {player.user.display_name.charAt(0).toUpperCase()}
                          </span>
                        </div>
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
                    )
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
                      onClick={toggleReady}
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
                      {roomPlayers.length < 2
                        ? "Need at least 2 players to start"
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
        ) : (
          // Active game view
          <div className="max-w-7xl mx-auto">
            <GameTable
              players={roomPlayers}
              gameType={currentRoom.game_type}
              currentPlayer={0} // This would come from game state
              pot={currentGame ? (currentGame.game_state as any).pot : 0}
              communityCards={
                currentGame
                  ? (currentGame.game_state as any).community_cards
                  : []
              }
            />

            {/* Game controls for active game */}
            <div className="mt-6 bg-gray-800 border border-gray-700 rounded-2xl p-6">
              <div className="flex justify-center space-x-4">
                <button className="px-6 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-500 transition-colors">
                  Fold
                </button>
                <button className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-500 transition-colors">
                  Call
                </button>
                <button className="px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-500 transition-colors">
                  Raise
                </button>
              </div>
            </div>
          </div>
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

export default GameRoom;
