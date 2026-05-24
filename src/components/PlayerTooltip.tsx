import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Target, TrendingUp, Coins, ExternalLink } from "lucide-react";
import { supabase } from "../lib/supabase";
import { User } from "../types";

interface PlayerTooltipProps {
  userId: string;
  children: React.ReactNode;
  className?: string;
}

interface PlayerProfile {
  id: string;
  display_name: string;
  username: string;
  avatar_url?: string;
  chip_balance: number;
  total_games: number;
  games_won: number;
  role: string;
  banner_id?: string;
  created_at: string;
}

const PlayerTooltip: React.FC<PlayerTooltipProps> = ({
  userId,
  children,
  className = "",
}) => {
  const [show, setShow] = useState(false);
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchProfile = async () => {
    if (profile) return; // already cached
    setLoading(true);
    try {
      const { data } = await supabase
        .from("users")
        .select(
          "id, display_name, username, avatar_url, chip_balance, total_games, games_won, role, banner_id, created_at",
        )
        .eq("id", userId)
        .single();
      if (data) setProfile(data);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  };

  const handleMouseEnter = () => {
    setShow(true);
    fetchProfile();
  };

  const winRate =
    profile && profile.total_games > 0
      ? Math.round((profile.games_won / profile.total_games) * 100)
      : 0;

  return (
    <div
      className={`relative inline-block ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => setShow(false)}
    >
      {children}

      <AnimatePresence>
        {show && (
          <motion.div
            initial={{ opacity: 0, y: 5, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 5, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-64"
          >
            <div className="bg-gray-800 border border-gray-600 rounded-xl shadow-2xl overflow-hidden">
              {loading || !profile ? (
                <div className="p-4 text-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-2 border-yellow-400 border-t-transparent mx-auto" />
                </div>
              ) : (
                <>
                  {/* Mini banner */}
                  <div className="h-12 bg-gradient-to-r from-blue-500 to-purple-600" />

                  <div className="px-4 pb-3 -mt-5">
                    {/* Avatar */}
                    <div className="flex items-end space-x-3 mb-2">
                      <div className="w-10 h-10 rounded-full border-2 border-gray-800 bg-gray-700 flex items-center justify-center overflow-hidden flex-shrink-0">
                        {profile.avatar_url ? (
                          <img
                            src={profile.avatar_url}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-white font-bold text-sm">
                            {profile.display_name.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0 pt-5">
                        <p className="text-white font-semibold text-sm truncate">
                          {profile.display_name}
                        </p>
                        <p className="text-gray-400 text-xs">
                          @{profile.username}
                        </p>
                      </div>
                      <span
                        className={`ml-auto text-xs px-1.5 py-0.5 rounded font-medium ${
                          profile.role === "admin"
                            ? "bg-purple-500/20 text-purple-300"
                            : profile.role === "mod"
                              ? "bg-blue-500/20 text-blue-300"
                              : "bg-green-500/20 text-green-300"
                        }`}
                      >
                        {profile.role.toUpperCase()}
                      </span>
                    </div>

                    {/* Stats row */}
                    <div className="grid grid-cols-3 gap-2 mt-3">
                      <div className="text-center">
                        <p className="text-yellow-400 text-sm font-bold">
                          {profile.chip_balance.toLocaleString()}
                        </p>
                        <p className="text-gray-500 text-[10px]">Chips</p>
                      </div>
                      <div className="text-center">
                        <p className="text-blue-400 text-sm font-bold">
                          {profile.total_games}
                        </p>
                        <p className="text-gray-500 text-[10px]">Games</p>
                      </div>
                      <div className="text-center">
                        <p className="text-green-400 text-sm font-bold">
                          {winRate}%
                        </p>
                        <p className="text-gray-500 text-[10px]">Win Rate</p>
                      </div>
                    </div>

                    {/* View profile link */}
                    <a
                      href={`/player/${profile.id}`}
                      className="mt-3 flex items-center justify-center space-x-1 text-xs text-gray-400 hover:text-yellow-400 transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <span>View Profile</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </>
              )}
            </div>
            {/* Arrow */}
            <div className="absolute left-1/2 -translate-x-1/2 -bottom-1 w-2 h-2 bg-gray-800 border-r border-b border-gray-600 rotate-45" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PlayerTooltip;
