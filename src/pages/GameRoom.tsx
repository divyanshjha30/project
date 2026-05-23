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
    makeMove,
    loading,
  } = useGame();

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [loadingTimeout, setLoadingTimeout] = useState(false);
  const [raiseAmount, setRaiseAmount] = useState(0);

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
    console.log("GameRoom: Start Game button clicked");
    console.log("GameRoom: roomId:", roomId);
    console.log("GameRoom: isHost:", isHost);
    console.log("GameRoom: allPlayersReady:", allPlayersReady);

    if (roomId) {
      const result = await startGame(roomId);
      console.log("GameRoom: Start game result:", result);
      if (result) {
        console.log(
          "GameRoom: Game started successfully, real-time should update UI"
        );
        // Game started, the real-time subscription will update the UI
      }
    } else {
      console.log("GameRoom: No roomId available");
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
          <ActiveGameView
            currentGame={currentGame}
            currentRoom={currentRoom}
            user={user}
            makeMove={makeMove}
            raiseAmount={raiseAmount}
            setRaiseAmount={setRaiseAmount}
            roomPlayers={roomPlayers}
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

// Active Game View Component
const ActiveGameView: React.FC<{
  currentGame: any;
  currentRoom: any;
  user: any;
  makeMove: (action: "fold" | "call" | "raise" | "check", amount?: number) => Promise<boolean>;
  raiseAmount: number;
  setRaiseAmount: (n: number) => void;
  roomPlayers: any[];
}> = ({ currentGame, currentRoom, user, makeMove, raiseAmount, setRaiseAmount, roomPlayers }) => {
  if (!currentGame?.game_state) {
    return (
      <div className="max-w-4xl mx-auto text-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400 mx-auto mb-4"></div>
        <p className="text-gray-400">Loading game state...</p>
      </div>
    );
  }

  const gameState = currentGame.game_state as any;
  const myPlayerIndex = gameState.players?.findIndex((p: any) => p.user_id === user?.id) ?? -1;
  const myPlayer = myPlayerIndex >= 0 ? gameState.players[myPlayerIndex] : null;
  const isMyTurn = gameState.current_player === myPlayerIndex && gameState.phase !== "finished" && gameState.phase !== "showdown";
  const canCheck = isMyTurn && (gameState.current_bet === 0 || (myPlayer && myPlayer.current_bet === gameState.current_bet));
  const callAmount = myPlayer ? gameState.current_bet - myPlayer.current_bet : 0;
  const minRaise = gameState.current_bet * 2 || gameState.big_blind * 2;

  const getPlayerDisplayName = (userId: string) => {
    const rp = roomPlayers.find((p: any) => p.user_id === userId);
    return rp?.user?.display_name || userId.slice(0, 8);
  };

  const suitSymbol: Record<string, string> = { hearts: "♥", diamonds: "♦", clubs: "♣", spades: "♠" };
  const suitColor: Record<string, string> = { hearts: "text-red-500", diamonds: "text-red-500", clubs: "text-white", spades: "text-white" };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Game Info Bar */}
      <div className="flex items-center justify-between bg-gray-800 border border-gray-700 rounded-xl p-4">
        <div className="flex items-center space-x-6">
          <span className="text-gray-400 text-sm">Phase: <span className="text-yellow-400 font-semibold uppercase">{gameState.phase}</span></span>
          <span className="text-gray-400 text-sm">Pot: <span className="text-yellow-400 font-semibold">{gameState.pot} chips</span></span>
          <span className="text-gray-400 text-sm">Blinds: <span className="text-white">{gameState.small_blind}/{gameState.big_blind}</span></span>
        </div>
        {isMyTurn && (
          <span className="bg-yellow-600 text-black px-3 py-1 rounded-full text-sm font-bold animate-pulse">
            YOUR TURN
          </span>
        )}
        {gameState.phase === "finished" && (
          <span className="bg-green-600 text-white px-3 py-1 rounded-full text-sm font-bold">
            HAND COMPLETE
          </span>
        )}
      </div>

      {/* Community Cards */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
        <h3 className="text-sm text-gray-400 mb-3 text-center">Community Cards</h3>
        <div className="flex justify-center gap-3">
          {gameState.community_cards && gameState.community_cards.length > 0 ? (
            gameState.community_cards.map((card: any, i: number) => (
              <motion.div
                key={card.id || i}
                initial={{ opacity: 0, rotateY: 180 }}
                animate={{ opacity: 1, rotateY: 0 }}
                transition={{ delay: i * 0.15, duration: 0.3 }}
                className="w-16 h-24 bg-white rounded-lg border-2 border-gray-300 flex flex-col items-center justify-center shadow-lg"
              >
                <span className={`text-xl font-bold ${suitColor[card.suit]}`}>{card.rank}</span>
                <span className={`text-2xl ${suitColor[card.suit]}`}>{suitSymbol[card.suit]}</span>
              </motion.div>
            ))
          ) : (
            Array.from({ length: 5 }, (_, i) => (
              <div key={i} className="w-16 h-24 bg-gray-700 rounded-lg border-2 border-dashed border-gray-600 flex items-center justify-center">
                <span className="text-gray-500 text-xs">?</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Players */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {gameState.players?.map((player: any, idx: number) => {
          const isMe = player.user_id === user?.id;
          const isActive = gameState.current_player === idx && gameState.phase !== "finished" && gameState.phase !== "showdown";
          const showCards = isMe || gameState.phase === "showdown" || gameState.phase === "finished";

          return (
            <motion.div
              key={player.user_id}
              className={`bg-gray-800 border-2 rounded-xl p-4 ${
                isActive ? "border-yellow-400 shadow-lg shadow-yellow-400/20" :
                player.has_folded ? "border-red-900 opacity-50" :
                isMe ? "border-blue-500" : "border-gray-700"
              }`}
              animate={isActive ? { scale: [1, 1.02, 1] } : {}}
              transition={{ duration: 1, repeat: isActive ? Infinity : 0 }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className={`text-sm font-semibold truncate ${isMe ? "text-blue-400" : "text-white"}`}>
                  {isMe ? "You" : getPlayerDisplayName(player.user_id)}
                </span>
                {isActive && <span className="w-2 h-2 bg-yellow-400 rounded-full animate-ping"></span>}
              </div>

              {/* Cards */}
              <div className="flex gap-1 mb-2 justify-center">
                {player.cards && player.cards.length > 0 ? (
                  showCards ? (
                    player.cards.map((card: any, ci: number) => (
                      <div key={ci} className="w-12 h-18 bg-white rounded border border-gray-300 flex flex-col items-center justify-center p-1">
                        <span className={`text-sm font-bold ${suitColor[card.suit]}`}>{card.rank}</span>
                        <span className={`text-lg ${suitColor[card.suit]}`}>{suitSymbol[card.suit]}</span>
                      </div>
                    ))
                  ) : (
                    player.cards.map((_: any, ci: number) => (
                      <div key={ci} className="w-12 h-18 bg-gradient-to-br from-blue-900 to-blue-700 rounded border-2 border-blue-600 flex items-center justify-center">
                        <div className="w-6 h-6 bg-blue-600 rounded-full opacity-50"></div>
                      </div>
                    ))
                  )
                ) : null}
              </div>

              {/* Player info */}
              <div className="text-center space-y-1">
                <div className="text-yellow-300 text-xs font-semibold">{player.chip_count} chips</div>
                {player.current_bet > 0 && (
                  <div className="text-orange-400 text-xs">Bet: {player.current_bet}</div>
                )}
                {player.has_folded && (
                  <div className="text-red-400 text-xs font-bold">FOLDED</div>
                )}
                {player.is_all_in && (
                  <div className="text-purple-400 text-xs font-bold">ALL IN</div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* My Cards (larger display) */}
      {myPlayer && !myPlayer.has_folded && (
        <div className="bg-gray-800 border border-blue-500 rounded-xl p-4">
          <h3 className="text-sm text-blue-400 mb-2 text-center">Your Hand</h3>
          <div className="flex justify-center gap-4">
            {myPlayer.cards?.map((card: any, i: number) => (
              <motion.div
                key={card.id || i}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: i * 0.2 }}
                className="w-20 h-28 bg-white rounded-lg border-2 border-blue-400 flex flex-col items-center justify-center shadow-xl"
              >
                <span className={`text-2xl font-bold ${suitColor[card.suit]}`}>{card.rank}</span>
                <span className={`text-3xl ${suitColor[card.suit]}`}>{suitSymbol[card.suit]}</span>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Action Controls */}
      {isMyTurn && myPlayer && !myPlayer.has_folded && (
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-gray-800 border border-yellow-600 rounded-xl p-6"
        >
          <h3 className="text-center text-yellow-400 font-semibold mb-4">Your Action</h3>
          <div className="flex flex-wrap justify-center gap-3">
            <button
              onClick={() => makeMove("fold")}
              className="px-6 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-500 transition-colors"
            >
              Fold
            </button>

            {canCheck ? (
              <button
                onClick={() => makeMove("check")}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-500 transition-colors"
              >
                Check
              </button>
            ) : (
              <button
                onClick={() => makeMove("call")}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-500 transition-colors"
              >
                Call ({callAmount})
              </button>
            )}

            <div className="flex items-center gap-2">
              <input
                type="number"
                value={raiseAmount || minRaise}
                onChange={(e) => setRaiseAmount(parseInt(e.target.value) || minRaise)}
                min={minRaise}
                max={myPlayer.chip_count + myPlayer.current_bet}
                className="w-24 px-3 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white text-center"
              />
              <button
                onClick={() => makeMove("raise", raiseAmount || minRaise)}
                className="px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-500 transition-colors"
              >
                Raise
              </button>
            </div>

            <button
              onClick={() => makeMove("raise", myPlayer.chip_count + myPlayer.current_bet)}
              className="px-6 py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-500 transition-colors"
            >
              All In ({myPlayer.chip_count})
            </button>
          </div>
        </motion.div>
      )}

      {/* Waiting for opponent */}
      {!isMyTurn && gameState.phase !== "finished" && gameState.phase !== "showdown" && myPlayer && !myPlayer.has_folded && (
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 text-center">
          <p className="text-gray-400">
            Waiting for <span className="text-yellow-400 font-semibold">{getPlayerDisplayName(gameState.players[gameState.current_player]?.user_id)}</span> to act...
          </p>
        </div>
      )}

      {/* Game Over */}
      {(gameState.phase === "finished" || gameState.phase === "showdown") && (
        <div className="bg-gray-800 border border-green-600 rounded-xl p-6 text-center">
          <h3 className="text-xl font-bold text-green-400 mb-2">Hand Complete!</h3>
          <div className="space-y-2">
            {gameState.players?.map((p: any) => (
              <div key={p.user_id} className="text-gray-300">
                <span className={p.user_id === user?.id ? "text-blue-400" : "text-white"}>
                  {p.user_id === user?.id ? "You" : getPlayerDisplayName(p.user_id)}
                </span>
                : {p.chip_count} chips
                {p.has_folded && <span className="text-red-400 ml-2">(folded)</span>}
              </div>
            ))}
          </div>
          <p className="text-gray-500 text-sm mt-4">A new hand will start when the host starts another game.</p>
        </div>
      )}
    </div>
  );
};

export default GameRoom;
