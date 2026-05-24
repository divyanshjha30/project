import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Users,
  Play,
  Crown,
  Clock,
  Trophy,
  History,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";

interface RecentGame {
  id: string;
  room_name: string;
  game_type: "poker" | "blackjack";
  finished_at: string;
  result: "won" | "lost" | "push";
  net_chips: number;
  players: string[];
  details: string;
}

const GameHistory: React.FC = () => {
  const { user } = useAuth();
  const [games, setGames] = useState<RecentGame[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<"all" | "poker" | "blackjack">("all");

  const fetchGameHistory = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data: gamesData } = await supabase
        .from("games")
        .select("id, room_id, game_state, finished_at")
        .not("finished_at", "is", null)
        .order("finished_at", { ascending: false })
        .limit(50);

      if (!gamesData) {
        setGames([]);
        return;
      }

      const roomIds = [...new Set(gamesData.map((g) => g.room_id))];
      const { data: roomsData } = await supabase
        .from("rooms")
        .select("id, name, game_type")
        .in("id", roomIds);

      const roomMap = new Map(
        roomsData?.map((r) => [
          r.id,
          { name: r.name, game_type: r.game_type },
        ]) || [],
      );

      const parsed: RecentGame[] = [];

      for (const game of gamesData) {
        const state = game.game_state as any;
        if (!state) continue;

        const roomInfo = roomMap.get(game.room_id);
        const gameType = state.type || roomInfo?.game_type || "poker";

        let netChips = 0;
        let result: "won" | "lost" | "push" = "lost";
        let players: string[] = [];
        let details = "";

        if (gameType === "blackjack") {
          const bjPlayers = state.players || [];
          players = bjPlayers.map((p: any) => p.user_id);
          if (!players.includes(user.id)) continue;

          const bjResult = state.results?.find(
            (r: any) => r.user_id === user.id,
          );
          if (bjResult) {
            netChips = bjResult.net_chips;
            result = netChips > 0 ? "won" : netChips < 0 ? "lost" : "push";
            details = bjResult.hands_summary?.join(", ") || "";
          }
        } else {
          const pokerPlayers = state.players || [];
          players = pokerPlayers.map((p: any) => p.user_id);
          if (!players.includes(user.id)) continue;

          if (state.result) {
            const isWinner = state.result.winners?.some(
              (w: any) => w.user_id === user.id,
            );
            if (isWinner) {
              const winEntry = state.result.winners.find(
                (w: any) => w.user_id === user.id,
              );
              netChips = winEntry?.chips_won || 0;
              result = "won";
              details = winEntry?.hand_description || "Won";
            } else {
              result = "lost";
              const myPlayer = pokerPlayers.find(
                (p: any) => p.user_id === user.id,
              );
              netChips = myPlayer?.current_bet ? -myPlayer.current_bet : 0;
              const loserEntry = state.result.losers?.find(
                (l: any) => l.user_id === user.id,
              );
              details = loserEntry?.hand_description || "Lost";
            }
          }
        }

        parsed.push({
          id: game.id,
          room_name: roomInfo?.name || "Unknown Room",
          game_type: gameType,
          finished_at: game.finished_at,
          result,
          net_chips: netChips,
          players,
          details,
        });
      }

      setGames(parsed);
    } catch (err) {
      console.error("Error fetching game history:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGameHistory();
  }, [user]);

  const filteredGames =
    filter === "all" ? games : games.filter((g) => g.game_type === filter);

  const totalWins = games.filter((g) => g.result === "won").length;
  const totalLosses = games.filter((g) => g.result === "lost").length;
  const totalPushes = games.filter((g) => g.result === "push").length;
  const netProfit = games.reduce((sum, g) => sum + g.net_chips, 0);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <History className="h-8 w-8 text-yellow-400" />
          Game History
        </h1>
        <button
          onClick={fetchGameHistory}
          disabled={loading}
          className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50"
        >
          {loading ? "Loading..." : "Refresh"}
        </button>
      </motion.div>

      {/* Summary Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 md:grid-cols-5 gap-4"
      >
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-white">{games.length}</div>
          <div className="text-xs text-gray-400">Total Rounds</div>
        </div>
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-green-400">{totalWins}</div>
          <div className="text-xs text-gray-400">Wins</div>
        </div>
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-red-400">{totalLosses}</div>
          <div className="text-xs text-gray-400">Losses</div>
        </div>
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-gray-400">{totalPushes}</div>
          <div className="text-xs text-gray-400">Pushes</div>
        </div>
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 text-center">
          <div
            className={`text-2xl font-bold ${netProfit >= 0 ? "text-green-400" : "text-red-400"}`}
          >
            {netProfit >= 0 ? `+${netProfit}` : netProfit}
          </div>
          <div className="text-xs text-gray-400">Net Chips</div>
        </div>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="flex gap-2"
      >
        {(["all", "poker", "blackjack"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === f
                ? "bg-yellow-600 text-black"
                : "bg-gray-700 text-gray-300 hover:bg-gray-600"
            }`}
          >
            {f === "all" ? "All Games" : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </motion.div>

      {/* Game List */}
      {filteredGames.length === 0 && !loading ? (
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-12 text-center">
          <Trophy className="h-16 w-16 text-gray-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">
            No games played yet
          </h3>
          <p className="text-gray-400">
            Join a room and play to see your game history here!
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredGames.map((game, index) => (
            <motion.div
              key={game.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: index * 0.03 }}
              className="bg-gray-800 border border-gray-700 rounded-xl p-4 hover:border-gray-600 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2.5 rounded-lg ${
                      game.game_type === "poker"
                        ? "bg-blue-600/20 text-blue-400"
                        : "bg-green-600/20 text-green-400"
                    }`}
                  >
                    {game.game_type === "poker" ? (
                      <Crown className="h-5 w-5" />
                    ) : (
                      <Play className="h-5 w-5" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-white font-semibold">
                        {game.room_name}
                      </span>
                      <span className="text-gray-500 text-xs uppercase px-2 py-0.5 bg-gray-700 rounded">
                        {game.game_type}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-400 mt-1">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(game.finished_at).toLocaleDateString()}{" "}
                        {new Date(game.finished_at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {game.players.length} player
                        {game.players.length !== 1 && "s"}
                      </span>
                    </div>
                    {game.details && (
                      <div className="text-xs text-gray-500 mt-1">
                        {game.details}
                      </div>
                    )}
                  </div>
                </div>

                <div className="text-right flex flex-col items-end gap-1">
                  <span
                    className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${
                      game.result === "won"
                        ? "bg-green-500/20 text-green-400"
                        : game.result === "push"
                          ? "bg-gray-500/20 text-gray-400"
                          : "bg-red-500/20 text-red-400"
                    }`}
                  >
                    {game.result === "won" ? (
                      <TrendingUp className="h-3 w-3" />
                    ) : game.result === "lost" ? (
                      <TrendingDown className="h-3 w-3" />
                    ) : null}
                    {game.result.toUpperCase()}
                  </span>
                  <span
                    className={`text-sm font-bold ${
                      game.net_chips > 0
                        ? "text-green-400"
                        : game.net_chips < 0
                          ? "text-red-400"
                          : "text-gray-400"
                    }`}
                  >
                    {game.net_chips > 0
                      ? `+${game.net_chips}`
                      : game.net_chips < 0
                        ? `${game.net_chips}`
                        : "±0"}{" "}
                    chips
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default GameHistory;
