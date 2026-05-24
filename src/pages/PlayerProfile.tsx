import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  User,
  Trophy,
  Target,
  Calendar,
  Coins,
  TrendingUp,
  ArrowLeft,
  Shield,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { BANNER_PRESETS } from "../constants/banners";

interface PublicProfile {
  id: string;
  display_name: string;
  username: string;
  avatar_url?: string;
  chip_balance: number;
  total_games: number;
  games_won: number;
  games_lost: number;
  role: string;
  banner_id?: string;
  created_at: string;
}

const PlayerProfile: React.FC = () => {
  const { playerId } = useParams<{ playerId: string }>();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (playerId) fetchProfile();
  }, [playerId]);

  const fetchProfile = async () => {
    try {
      const { data } = await supabase
        .from("users")
        .select(
          "id, display_name, username, avatar_url, chip_balance, total_games, games_won, games_lost, role, banner_id, created_at",
        )
        .eq("id", playerId)
        .single();
      if (data) setProfile(data);
    } catch {
      // not found
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-2 border-yellow-400 border-t-transparent" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">
            Player not found
          </h1>
          <button
            onClick={() => navigate(-1)}
            className="px-6 py-3 bg-yellow-600 text-black rounded-lg font-semibold hover:bg-yellow-500 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const winRate =
    profile.total_games > 0
      ? Math.round((profile.games_won / profile.total_games) * 100)
      : 0;

  const banner = BANNER_PRESETS.find((b) => b.id === profile.banner_id);
  const bannerClass = banner?.gradient || "from-blue-500 to-purple-600";

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-3xl mx-auto">
        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors mb-6"
        >
          <ArrowLeft className="h-5 w-5" />
          <span>Back</span>
        </button>

        {/* Profile Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gray-800 border border-gray-700 rounded-2xl overflow-hidden"
        >
          {/* Banner */}
          <div className={`h-32 bg-gradient-to-r ${bannerClass}`} />

          <div className="px-8 pb-8 pt-4">
            <div className="flex items-center space-x-5 -mt-14">
              {/* Avatar */}
              <div className="w-24 h-24 rounded-full border-4 border-gray-800 bg-gray-700 flex items-center justify-center overflow-hidden flex-shrink-0">
                {profile.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="h-10 w-10 text-gray-300" />
                )}
              </div>

              <div className="pt-10">
                <div className="flex items-center space-x-3">
                  <h1 className="text-2xl font-bold text-white">
                    {profile.display_name}
                  </h1>
                  <span
                    className={`text-xs px-2 py-0.5 rounded font-medium ${
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
                <p className="text-gray-400">@{profile.username}</p>
                <p className="text-gray-500 text-sm mt-1 flex items-center">
                  <Calendar className="h-3.5 w-3.5 mr-1" /> Joined{" "}
                  {new Date(profile.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
              <div className="bg-gray-900/50 rounded-xl p-4 text-center border border-gray-700">
                <Coins className="h-5 w-5 text-yellow-400 mx-auto mb-1" />
                <p className="text-yellow-400 font-bold text-lg">
                  {profile.chip_balance.toLocaleString()}
                </p>
                <p className="text-gray-500 text-xs">Chips</p>
              </div>
              <div className="bg-gray-900/50 rounded-xl p-4 text-center border border-gray-700">
                <Target className="h-5 w-5 text-blue-400 mx-auto mb-1" />
                <p className="text-blue-400 font-bold text-lg">
                  {profile.total_games}
                </p>
                <p className="text-gray-500 text-xs">Games Played</p>
              </div>
              <div className="bg-gray-900/50 rounded-xl p-4 text-center border border-gray-700">
                <Trophy className="h-5 w-5 text-green-400 mx-auto mb-1" />
                <p className="text-green-400 font-bold text-lg">
                  {profile.games_won}
                </p>
                <p className="text-gray-500 text-xs">Wins</p>
              </div>
              <div className="bg-gray-900/50 rounded-xl p-4 text-center border border-gray-700">
                <TrendingUp className="h-5 w-5 text-purple-400 mx-auto mb-1" />
                <p className="text-purple-400 font-bold text-lg">{winRate}%</p>
                <p className="text-gray-500 text-xs">Win Rate</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default PlayerProfile;
