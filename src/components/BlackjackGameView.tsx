import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import Card from "./Card";
import PlayerAvatar from "./PlayerAvatar";
import {
  Game,
  Room,
  User,
  RoomPlayer,
  BlackjackGameState,
  BlackjackHand,
  BlackjackResult,
} from "../types";
import { calculateBlackjackValue } from "../utils/cardUtils";

interface BlackjackGameViewProps {
  currentGame: Game | null;
  currentRoom: Room;
  user: User | null;
  makeBlackjackMove: (
    action: "hit" | "stand" | "double_down" | "split",
  ) => Promise<boolean>;
  dealNextBlackjackRound: () => Promise<boolean>;
  isHost: boolean;
  roomPlayers: RoomPlayer[];
  playerNameCache: Record<string, string>;
}

const BlackjackGameView: React.FC<BlackjackGameViewProps> = ({
  currentGame,
  currentRoom,
  user,
  makeBlackjackMove,
  dealNextBlackjackRound,
  isHost,
  roomPlayers,
  playerNameCache,
}) => {
  if (!currentGame || !user) return null;

  const state = currentGame.game_state as BlackjackGameState;
  if (state.type !== "blackjack") return null;

  const myPlayerIndex = state.players.findIndex((p) => p.user_id === user.id);
  const myPlayer = myPlayerIndex >= 0 ? state.players[myPlayerIndex] : null;
  const isMyTurn = state.current_player === myPlayerIndex;

  const getPlayerName = (userId: string) => {
    if (playerNameCache[userId]) return playerNameCache[userId];
    const rp = roomPlayers.find((p) => p.user_id === userId);
    return (rp as any)?.user?.display_name || userId.slice(0, 8);
  };

  const getPlayerAvatar = (userId: string) => {
    const rp = roomPlayers.find((p) => p.user_id === userId);
    return rp?.user?.avatar_url || null;
  };

  const dealerValue = calculateBlackjackValue(state.dealer_cards);
  const visibleDealerValue = calculateBlackjackValue(
    state.dealer_visible_cards,
  );

  const canSplit = () => {
    if (!myPlayer || !isMyTurn) return false;
    const hand = myPlayer.hands[myPlayer.current_hand];
    return (
      hand.cards.length === 2 &&
      hand.cards[0].rank === hand.cards[1].rank &&
      hand.status === "playing"
    );
  };

  const canDoubleDown = () => {
    if (!myPlayer || !isMyTurn) return false;
    const hand = myPlayer.hands[myPlayer.current_hand];
    return (
      hand.cards.length === 2 &&
      hand.status === "playing" &&
      hand.value >= 9 &&
      hand.value <= 11
    );
  };

  const getHandResult = (
    hand: BlackjackHand,
  ): { text: string; color: string } => {
    if (state.phase !== "finished") return { text: "", color: "" };
    if (hand.status === "bust" || hand.value > 21) {
      return { text: "BUST", color: "text-red-400" };
    }

    const dealerVal = dealerValue.value;
    const dealerBust = dealerVal > 21;
    const isBlackjack = hand.cards.length === 2 && hand.value === 21;
    const dealerBlackjack = state.dealer_cards.length === 2 && dealerVal === 21;

    if (isBlackjack && !dealerBlackjack) {
      return { text: "BLACKJACK! (3:2)", color: "text-yellow-400" };
    }
    if (isBlackjack && dealerBlackjack) {
      return { text: "PUSH", color: "text-gray-400" };
    }
    if (dealerBust) {
      return { text: "WIN!", color: "text-green-400" };
    }
    if (hand.value > dealerVal) {
      return { text: "WIN!", color: "text-green-400" };
    }
    if (hand.value === dealerVal) {
      return { text: "PUSH", color: "text-gray-400" };
    }
    return { text: "LOSE", color: "text-red-400" };
  };

  return (
    <div className="flex flex-col items-center gap-4 w-full max-w-4xl mx-auto">
      {/* Blackjack Table */}
      <div className="relative w-full aspect-[16/10] max-h-[500px] rounded-[60px] bg-gradient-to-b from-green-800 to-green-900 border-8 border-amber-900 shadow-2xl overflow-hidden">
        {/* Table felt pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="w-full h-full bg-[radial-gradient(circle_at_50%_50%,_transparent_20%,_rgba(0,0,0,0.3)_100%)]" />
        </div>

        {/* "BLACKJACK PAYS 3 TO 2" text */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 text-yellow-400/40 text-sm font-bold tracking-widest">
          BLACKJACK PAYS 3 TO 2
        </div>

        {/* Dealer Area */}
        <div className="absolute top-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
          <span className="text-yellow-400/70 text-xs font-semibold uppercase tracking-wider">
            Dealer
          </span>
          <div className="flex gap-2">
            <AnimatePresence>
              {state.phase === "finished" || state.phase === "dealer_turn"
                ? state.dealer_cards.map((card, i) => (
                    <motion.div
                      key={`dealer-${i}`}
                      initial={{ x: -50, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: i * 0.2 }}
                    >
                      <Card card={card} className="w-14 h-20" />
                    </motion.div>
                  ))
                : state.dealer_visible_cards.map((card, i) => (
                    <motion.div
                      key={`dealer-vis-${i}`}
                      initial={{ x: -50, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: i * 0.2 }}
                    >
                      <Card card={card} className="w-14 h-20" />
                    </motion.div>
                  ))}
              {/* Show face-down card when not revealed */}
              {state.phase !== "finished" &&
                state.phase !== "dealer_turn" &&
                state.dealer_cards.length > 1 && (
                  <motion.div
                    key="dealer-hidden"
                    initial={{ x: -50, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.4 }}
                  >
                    <Card card={null} faceDown className="w-14 h-20" />
                  </motion.div>
                )}
            </AnimatePresence>
          </div>
          <span className="text-white/80 text-sm font-bold">
            {state.phase === "finished" || state.phase === "dealer_turn"
              ? dealerValue.value
              : visibleDealerValue.value}
            {state.phase !== "finished" &&
              state.phase !== "dealer_turn" &&
              " + ?"}
          </span>
        </div>

        {/* Players Area */}
        <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-8 px-4">
          {state.players.map((player, pIdx) => {
            const isMe = player.user_id === user.id;
            const isCurrent = pIdx === state.current_player;
            const name = getPlayerName(player.user_id);

            return (
              <div
                key={player.user_id}
                className={`flex flex-col items-center gap-1 ${
                  isCurrent
                    ? "ring-2 ring-yellow-400 rounded-xl p-2 bg-yellow-400/10"
                    : "p-2"
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <PlayerAvatar
                    userId={player.user_id}
                    avatarUrl={getPlayerAvatar(player.user_id)}
                    displayName={name}
                    size="sm"
                  />
                  <span
                    className={`text-xs font-semibold ${
                      isMe ? "text-yellow-400" : "text-white/80"
                    }`}
                  >
                    {name} {isMe && "(You)"}
                  </span>
                </div>

                {/* Render each hand */}
                {player.hands.map((hand, hIdx) => {
                  const result = getHandResult(hand);
                  const isActiveHand =
                    isMe && isCurrent && player.current_hand === hIdx;

                  return (
                    <div
                      key={hIdx}
                      className={`flex flex-col items-center gap-1 ${
                        player.hands.length > 1
                          ? "border border-white/20 rounded-lg p-1"
                          : ""
                      } ${isActiveHand ? "bg-white/10" : ""}`}
                    >
                      <div className="flex gap-1">
                        {hand.cards.map((card, cIdx) => (
                          <motion.div
                            key={`p${pIdx}-h${hIdx}-c${cIdx}`}
                            initial={{ y: 30, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: cIdx * 0.15 }}
                          >
                            <Card card={card} className="w-12 h-[68px]" />
                          </motion.div>
                        ))}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-white text-xs font-bold">
                          {hand.value}
                        </span>
                        <span className="text-yellow-400/70 text-[10px]">
                          ${hand.bet}
                        </span>
                      </div>
                      {result.text && (
                        <motion.span
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className={`text-xs font-bold ${result.color}`}
                        >
                          {result.text}
                        </motion.span>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Phase indicator */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          {state.phase === "dealer_turn" && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-yellow-400 font-bold text-lg bg-black/50 px-4 py-2 rounded-full"
            >
              Dealer&apos;s Turn...
            </motion.div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      {state.phase === "playing" && isMyTurn && myPlayer && (
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="flex gap-3 flex-wrap justify-center"
        >
          <button
            onClick={() => makeBlackjackMove("hit")}
            className="px-6 py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl shadow-lg transition-all hover:scale-105"
          >
            Hit
          </button>
          <button
            onClick={() => makeBlackjackMove("stand")}
            className="px-6 py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl shadow-lg transition-all hover:scale-105"
          >
            Stand
          </button>
          {canDoubleDown() && (
            <button
              onClick={() => makeBlackjackMove("double_down")}
              className="px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl shadow-lg transition-all hover:scale-105"
            >
              Double Down
            </button>
          )}
          {canSplit() && (
            <button
              onClick={() => makeBlackjackMove("split")}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg transition-all hover:scale-105"
            >
              Split
            </button>
          )}
        </motion.div>
      )}

      {/* Waiting for other players */}
      {state.phase === "playing" && !isMyTurn && myPlayer && (
        <div className="text-gray-400 text-sm">
          Waiting for{" "}
          {getPlayerName(state.players[state.current_player]?.user_id || "")} to
          play...
        </div>
      )}

      {/* Game Over - Results & Deal Next Round */}
      {state.phase === "finished" && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center gap-4 w-full max-w-md"
        >
          {/* Results Summary */}
          <div className="w-full bg-gray-800/90 border border-gray-700 rounded-xl p-4">
            <h3 className="text-white font-bold text-center text-lg mb-3">
              Round Results
            </h3>
            <div className="text-center text-sm text-gray-400 mb-3">
              Dealer: {dealerValue.value}
              {dealerValue.value > 21 && (
                <span className="text-red-400 ml-1">(BUST)</span>
              )}
            </div>
            <div className="space-y-2">
              {state.results?.map((result: BlackjackResult) => {
                const name = getPlayerName(result.user_id);
                const isMe = result.user_id === user.id;
                return (
                  <div
                    key={result.user_id}
                    className={`flex flex-col gap-1 p-2 rounded-lg ${
                      isMe
                        ? "bg-yellow-400/10 border border-yellow-400/30"
                        : "bg-white/5"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`font-semibold text-sm ${
                          isMe ? "text-yellow-400" : "text-white"
                        }`}
                      >
                        {name} {isMe && "(You)"}
                      </span>
                      <span
                        className={`font-bold text-sm ${
                          result.net_chips > 0
                            ? "text-green-400"
                            : result.net_chips < 0
                              ? "text-red-400"
                              : "text-gray-400"
                        }`}
                      >
                        {result.net_chips > 0
                          ? `+$${result.net_chips}`
                          : result.net_chips < 0
                            ? `-$${Math.abs(result.net_chips)}`
                            : "$0 (Push)"}
                      </span>
                    </div>
                    {result.hands_summary.map((s, i) => (
                      <span key={i} className="text-xs text-gray-400 pl-2">
                        {s}
                      </span>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Deal Next Round Button — host or single-player can deal */}
          {isHost || state.players.length === 1 ? (
            <button
              onClick={dealNextBlackjackRound}
              className="px-8 py-3 bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-400 hover:to-amber-500 text-black font-bold rounded-xl shadow-lg transition-all hover:scale-105"
            >
              Deal Next Round
            </button>
          ) : (
            <span className="text-gray-400 text-sm">
              Waiting for host to deal next round...
            </span>
          )}
        </motion.div>
      )}
    </div>
  );
};

export default BlackjackGameView;
