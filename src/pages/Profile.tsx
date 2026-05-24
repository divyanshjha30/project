import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  User,
  Edit3,
  Trophy,
  Target,
  Calendar,
  Coins,
  TrendingUp,
  Award,
  Flame,
  Zap,
  Star,
  Shield,
  Crown,
  Sparkles,
  ChevronRight,
  Clock,
  Camera,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";
import UsernameInput from "../components/UsernameInput";
import { BANNER_PRESETS } from "../constants/banners";
import toast from "react-hot-toast";

interface ActivityItem {
  id: string;
  game_type: "poker" | "blackjack";
  result: "won" | "lost" | "push";
  net_chips: number;
  finished_at: string;
  room_name: string;
}

const Profile: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editData, setEditData] = useState({
    display_name: user?.display_name || "",
    username: user?.username || "",
  });
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);
  const [biggestWin, setBiggestWin] = useState(0);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [showBannerPicker, setShowBannerPicker] = useState(false);

  useEffect(() => {
    if (user) {
      fetchRecentActivity();
    }
  }, [user]);

  const fetchRecentActivity = async () => {
    if (!user) return;
    try {
      const { data: gamesData } = await supabase
        .from("games")
        .select("id, room_id, game_state, finished_at")
        .not("finished_at", "is", null)
        .order("finished_at", { ascending: false })
        .limit(20);

      if (!gamesData || gamesData.length === 0) return;

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

      const items: ActivityItem[] = [];
      let maxWin = 0;

      for (const game of gamesData) {
        const state = game.game_state as any;
        if (!state) continue;
        const roomInfo = roomMap.get(game.room_id);
        const gameType = state.type || roomInfo?.game_type || "poker";

        if (gameType === "blackjack" && state.results) {
          const myResult = state.results.find(
            (r: any) => r.user_id === user.id,
          );
          if (myResult) {
            const result =
              myResult.net_chips > 0
                ? "won"
                : myResult.net_chips < 0
                  ? "lost"
                  : "push";
            items.push({
              id: game.id,
              game_type: "blackjack",
              result,
              net_chips: myResult.net_chips,
              finished_at: game.finished_at,
              room_name: roomInfo?.name || "Unknown Room",
            });
            if (myResult.net_chips > maxWin) maxWin = myResult.net_chips;
          }
        } else if (gameType === "poker" && state.phase === "finished") {
          const players = state.players || [];
          const me = players.find((p: any) => p.user_id === user.id);
          if (me) {
            const winner = players.reduce((a: any, b: any) =>
              a.chips > b.chips ? a : b,
            );
            const result = winner.user_id === user.id ? "won" : "lost";
            const pot = state.pot || 0;
            const net =
              result === "won"
                ? pot
                : -(me.current_bet || state.current_bet || 0);
            items.push({
              id: game.id,
              game_type: "poker",
              result,
              net_chips: net,
              finished_at: game.finished_at,
              room_name: roomInfo?.name || "Unknown Room",
            });
            if (net > maxWin) maxWin = net;
          }
        }
      }

      setRecentActivity(items.slice(0, 8));
      setBiggestWin(maxWin);
    } catch (err) {
      console.error("Error fetching recent activity:", err);
    }
  };

  const compressImage = (file: File, maxSize = 512): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let { width, height } = img;

        // Scale down to max dimension
        if (width > maxSize || height > maxSize) {
          if (width > height) {
            height = Math.round((height * maxSize) / width);
            width = maxSize;
          } else {
            width = Math.round((width * maxSize) / height);
            height = maxSize;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Canvas not supported"));
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob);
            else reject(new Error("Compression failed"));
          },
          "image/jpeg",
          0.8,
        );
      };
      img.onerror = () => reject(new Error("Failed to load image"));
      img.src = URL.createObjectURL(file);
    });
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    setUploadingAvatar(true);
    try {
      const compressed = await compressImage(file);
      const filePath = `avatars/${user.id}.jpg`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, compressed, {
          upsert: true,
          contentType: "image/jpeg",
        });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      const avatarUrl = `${urlData.publicUrl}?t=${Date.now()}`;

      const { error: updateError } = await supabase
        .from("users")
        .update({ avatar_url: avatarUrl })
        .eq("id", user.id);

      if (updateError) throw updateError;

      toast.success("Profile picture updated!");
      await refreshUser();
    } catch (err: any) {
      toast.error(err.message || "Failed to upload picture");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    const trimmedName = editData.display_name.trim();
    const trimmedUsername = editData.username.trim();
    if (!trimmedName || !trimmedUsername) {
      toast.error("Name and username cannot be empty");
      return;
    }
    if (trimmedUsername.length < 3) {
      toast.error("Username must be at least 3 characters");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from("users")
        .update({ display_name: trimmedName, username: trimmedUsername })
        .eq("id", user.id);
      if (error) throw error;
      toast.success("Profile updated!");
      setIsEditing(false);
      await refreshUser();
    } catch (err: any) {
      toast.error(err.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  // Level system
  const getLevel = (totalGames: number) => {
    if (totalGames >= 500)
      return {
        level: 10,
        title: "Legend",
        color: "from-yellow-400 to-red-500",
      };
    if (totalGames >= 200)
      return {
        level: 9,
        title: "Master",
        color: "from-purple-400 to-pink-500",
      };
    if (totalGames >= 100)
      return {
        level: 8,
        title: "Expert",
        color: "from-blue-400 to-purple-500",
      };
    if (totalGames >= 75)
      return { level: 7, title: "Veteran", color: "from-cyan-400 to-blue-500" };
    if (totalGames >= 50)
      return {
        level: 6,
        title: "Experienced",
        color: "from-green-400 to-cyan-500",
      };
    if (totalGames >= 30)
      return {
        level: 5,
        title: "Skilled",
        color: "from-emerald-400 to-green-500",
      };
    if (totalGames >= 20)
      return {
        level: 4,
        title: "Regular",
        color: "from-teal-400 to-emerald-500",
      };
    if (totalGames >= 10)
      return {
        level: 3,
        title: "Apprentice",
        color: "from-sky-400 to-teal-500",
      };
    if (totalGames >= 5)
      return {
        level: 2,
        title: "Beginner",
        color: "from-slate-400 to-sky-500",
      };
    return { level: 1, title: "Newcomer", color: "from-gray-400 to-slate-500" };
  };

  const getLevelProgress = (totalGames: number) => {
    const thresholds = [0, 5, 10, 20, 30, 50, 75, 100, 200, 500];
    const levelInfo = getLevel(totalGames);
    const idx = levelInfo.level - 1;
    if (idx >= thresholds.length - 1) return 100;
    const current = totalGames - thresholds[idx];
    const needed = thresholds[idx + 1] - thresholds[idx];
    return Math.min(100, Math.round((current / needed) * 100));
  };

  const stats = [
    {
      label: "Total Games",
      value: user?.total_games || 0,
      icon: Target,
      color: "text-blue-400",
      bgColor: "bg-blue-500/10",
    },
    {
      label: "Wins",
      value: user?.games_won || 0,
      icon: Trophy,
      color: "text-yellow-400",
      bgColor: "bg-yellow-500/10",
    },
    {
      label: "Losses",
      value: user?.games_lost || 0,
      icon: Award,
      color: "text-red-400",
      bgColor: "bg-red-500/10",
    },
    {
      label: "Win Rate",
      value: user?.total_games
        ? `${Math.round((user.games_won / user.total_games) * 100)}%`
        : "0%",
      icon: TrendingUp,
      color: "text-green-400",
      bgColor: "bg-green-500/10",
    },
    {
      label: "Biggest Win",
      value: biggestWin > 0 ? `+${biggestWin.toLocaleString()}` : "—",
      icon: Zap,
      color: "text-purple-400",
      bgColor: "bg-purple-500/10",
    },
    {
      label: "Chip Balance",
      value: user?.chip_balance?.toLocaleString() || "0",
      icon: Coins,
      color: "text-yellow-400",
      bgColor: "bg-yellow-500/10",
    },
  ];

  const achievements = [
    {
      name: "First Steps",
      desc: "Play your first game",
      icon: Star,
      earned: (user?.total_games || 0) >= 1,
      progress: Math.min(100, ((user?.total_games || 0) / 1) * 100),
      goal: "1 game",
    },
    {
      name: "Winner",
      desc: "Win your first game",
      icon: Trophy,
      earned: (user?.games_won || 0) >= 1,
      progress: Math.min(100, ((user?.games_won || 0) / 1) * 100),
      goal: "1 win",
    },
    {
      name: "On a Roll",
      desc: "Win 10 games",
      icon: Flame,
      earned: (user?.games_won || 0) >= 10,
      progress: Math.min(100, ((user?.games_won || 0) / 10) * 100),
      goal: "10 wins",
    },
    {
      name: "High Roller",
      desc: "Accumulate 50,000 chips",
      icon: Coins,
      earned: (user?.chip_balance || 0) >= 50000,
      progress: Math.min(100, ((user?.chip_balance || 0) / 50000) * 100),
      goal: "50k chips",
    },
    {
      name: "Veteran",
      desc: "Play 100 games",
      icon: Shield,
      earned: (user?.total_games || 0) >= 100,
      progress: Math.min(100, ((user?.total_games || 0) / 100) * 100),
      goal: "100 games",
    },
    {
      name: "Sharpshooter",
      desc: "Achieve 60%+ win rate (min 20 games)",
      icon: Target,
      earned:
        (user?.total_games || 0) >= 20 &&
        (user?.games_won || 0) / (user?.total_games || 1) >= 0.6,
      progress:
        (user?.total_games || 0) >= 20
          ? Math.min(
              100,
              ((user?.games_won || 0) / (user?.total_games || 1) / 0.6) * 100,
            )
          : Math.min(100, ((user?.total_games || 0) / 20) * 100),
      goal: "60% win rate",
    },
    {
      name: "Millionaire",
      desc: "Hold 1,000,000 chips",
      icon: Crown,
      earned: (user?.chip_balance || 0) >= 1000000,
      progress: Math.min(100, ((user?.chip_balance || 0) / 1000000) * 100),
      goal: "1M chips",
    },
    {
      name: "Legend",
      desc: "Play 500 games",
      icon: Sparkles,
      earned: (user?.total_games || 0) >= 500,
      progress: Math.min(100, ((user?.total_games || 0) / 500) * 100),
      goal: "500 games",
    },
  ];

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400"></div>
      </div>
    );
  }

  const levelInfo = getLevel(user.total_games);
  const levelProgress = getLevelProgress(user.total_games);
  const earnedCount = achievements.filter((a) => a.earned).length;
  const selectedBanner = BANNER_PRESETS.find((b) => b.id === user.banner_id);
  const userBanner = selectedBanner?.gradient || levelInfo.color;

  const handleBannerSelect = async (bannerId: string) => {
    try {
      const { error } = await supabase
        .from("users")
        .update({ banner_id: bannerId })
        .eq("id", user.id);
      if (error) throw error;
      toast.success("Banner updated!");
      setShowBannerPicker(false);
      await refreshUser();
    } catch {
      toast.error("Failed to update banner");
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Profile Header Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative overflow-hidden bg-gray-800 border border-gray-700 rounded-2xl"
      >
        {/* Banner gradient */}
        <div
          className={`h-24 bg-gradient-to-r ${userBanner} opacity-90 relative group cursor-pointer`}
          onClick={() => setShowBannerPicker(!showBannerPicker)}
        >
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30">
            <span className="text-white text-sm font-medium">
              Change Banner
            </span>
          </div>
        </div>

        {/* Banner picker */}
        {showBannerPicker && (
          <div className="px-8 py-4 border-b border-gray-700 bg-gray-900/50">
            <p className="text-sm text-gray-300 mb-3 font-medium">
              Choose a banner
            </p>
            <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
              {BANNER_PRESETS.map((banner) => (
                <button
                  key={banner.id}
                  onClick={() => handleBannerSelect(banner.id)}
                  className={`h-10 rounded-lg bg-gradient-to-r ${banner.gradient} transition-all hover:scale-105 ${
                    user.banner_id === banner.id
                      ? "ring-2 ring-yellow-400 ring-offset-2 ring-offset-gray-900"
                      : ""
                  }`}
                  title={banner.name}
                />
              ))}
            </div>
          </div>
        )}

        <div className="px-8 pb-8 pt-4">
          <div className="flex flex-col md:flex-row items-start md:items-center space-y-4 md:space-y-0 md:space-x-6">
            {/* Avatar */}
            <div className="relative group -mt-16">
              <div className="w-28 h-28 bg-gradient-to-br from-gray-700 to-gray-800 rounded-full flex items-center justify-center border-4 border-gray-800 shadow-xl overflow-hidden">
                {user.avatar_url ? (
                  <img
                    src={user.avatar_url}
                    alt="Avatar"
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <User className="h-14 w-14 text-gray-300" />
                )}
              </div>
              {/* Upload overlay */}
              <label className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                {uploadingAvatar ? (
                  <div className="animate-spin rounded-full h-6 w-6 border-2 border-white border-t-transparent" />
                ) : (
                  <Camera className="h-6 w-6 text-white" />
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="hidden"
                  disabled={uploadingAvatar}
                />
              </label>
              <div
                className={`absolute -bottom-1 -right-1 px-2 py-0.5 rounded-full text-xs font-bold border-2 border-gray-800 ${
                  user.role === "admin"
                    ? "bg-purple-500 text-white"
                    : user.role === "mod"
                      ? "bg-blue-500 text-white"
                      : "bg-green-500 text-white"
                }`}
              >
                {user.role.toUpperCase()}
              </div>
            </div>

            {/* User Info */}
            <div className="flex-1">
              {isEditing ? (
                <div className="space-y-3">
                  <input
                    type="text"
                    value={editData.display_name}
                    onChange={(e) =>
                      setEditData((prev) => ({
                        ...prev,
                        display_name: e.target.value,
                      }))
                    }
                    className="text-xl font-bold bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white w-full md:w-72"
                    placeholder="Display name"
                    maxLength={30}
                  />
                  <div className="w-full md:w-72">
                    <UsernameInput
                      value={editData.username}
                      onChange={(val) =>
                        setEditData((prev) => ({ ...prev, username: val }))
                      }
                      currentUsername={user.username}
                      placeholder="username"
                    />
                  </div>
                  <div className="flex space-x-3">
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-500 transition-colors disabled:opacity-50"
                    >
                      {saving ? "Saving..." : "Save"}
                    </button>
                    <button
                      onClick={() => {
                        setIsEditing(false);
                        setEditData({
                          display_name: user.display_name,
                          username: user.username,
                        });
                      }}
                      className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-500 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center space-x-3">
                    <h1 className="text-2xl font-bold text-white">
                      {user.display_name}
                    </h1>
                    <button
                      onClick={() => setIsEditing(true)}
                      className="p-1.5 text-gray-400 hover:text-yellow-400 transition-colors rounded-lg hover:bg-gray-700"
                    >
                      <Edit3 className="h-4 w-4" />
                    </button>
                  </div>
                  <p className="text-gray-400">@{user.username}</p>
                  <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                    <span className="flex items-center">
                      <Calendar className="h-3.5 w-3.5 mr-1" /> Joined{" "}
                      {new Date(user.created_at).toLocaleDateString()}
                    </span>
                    <span className="flex items-center">
                      <Trophy className="h-3.5 w-3.5 mr-1" /> {earnedCount}/
                      {achievements.length} achievements
                    </span>
                  </div>
                </>
              )}
            </div>

            {/* Chip Balance Badge */}
            <div className="bg-gray-700/80 backdrop-blur rounded-xl p-4 text-center border border-gray-600">
              <div className="flex items-center justify-center space-x-2">
                <Coins className="h-5 w-5 text-yellow-400" />
                <span className="text-2xl font-bold text-yellow-400">
                  {user.chip_balance.toLocaleString()}
                </span>
              </div>
              <p className="text-gray-400 text-xs mt-1">Virtual Chips</p>
            </div>
          </div>

          {/* Level Progress */}
          <div className="mt-6 bg-gray-900/50 rounded-xl p-4 border border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <div
                  className={`w-8 h-8 rounded-full bg-gradient-to-r ${levelInfo.color} flex items-center justify-center`}
                >
                  <span className="text-xs font-bold text-white">
                    {levelInfo.level}
                  </span>
                </div>
                <div>
                  <span className="text-white font-semibold text-sm">
                    {levelInfo.title}
                  </span>
                  <span className="text-gray-500 text-xs ml-2">
                    Level {levelInfo.level}
                  </span>
                </div>
              </div>
              <span className="text-gray-400 text-xs">
                {user.total_games} games played
              </span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2.5 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${levelProgress}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
                className={`h-full rounded-full bg-gradient-to-r ${levelInfo.color}`}
              />
            </div>
            <p className="text-gray-500 text-xs mt-1.5">
              {levelProgress}% to next level
            </p>
          </div>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <h2 className="text-xl font-bold text-white mb-4">Statistics</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                className="bg-gray-800 border border-gray-700 rounded-xl p-4 text-center hover:border-gray-600 transition-colors"
              >
                <Icon className={`h-5 w-5 ${stat.color} mx-auto mb-2`} />
                <p className={`text-lg font-bold ${stat.color}`}>
                  {stat.value}
                </p>
                <p className="text-gray-500 text-xs mt-1">{stat.label}</p>
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {/* Achievements */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white">Achievements</h2>
          <span className="text-sm text-gray-400">
            {earnedCount}/{achievements.length} unlocked
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {achievements.map((achievement, index) => {
            const Icon = achievement.icon;
            return (
              <motion.div
                key={achievement.name}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                className={`p-4 border rounded-xl transition-all ${
                  achievement.earned
                    ? "border-yellow-500/50 bg-yellow-500/5"
                    : "border-gray-700 bg-gray-800/50"
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div
                    className={`p-2.5 rounded-lg ${
                      achievement.earned ? "bg-yellow-500/20" : "bg-gray-700"
                    }`}
                  >
                    <Icon
                      className={`h-5 w-5 ${
                        achievement.earned ? "text-yellow-400" : "text-gray-500"
                      }`}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3
                        className={`font-semibold text-sm ${
                          achievement.earned
                            ? "text-yellow-400"
                            : "text-gray-400"
                        }`}
                      >
                        {achievement.name}
                      </h3>
                      {achievement.earned && (
                        <span className="text-xs text-yellow-500 font-medium">
                          ✓ Unlocked
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {achievement.desc}
                    </p>
                    {!achievement.earned && (
                      <div className="mt-2">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-gray-500">
                            {Math.round(achievement.progress)}%
                          </span>
                          <span className="text-xs text-gray-600">
                            {achievement.goal}
                          </span>
                        </div>
                        <div className="w-full bg-gray-700 rounded-full h-1.5">
                          <div
                            className="h-full rounded-full bg-gray-500 transition-all duration-500"
                            style={{ width: `${achievement.progress}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {/* Recent Activity */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white">Recent Activity</h2>
          {recentActivity.length > 0 && (
            <a
              href="/history"
              className="text-sm text-yellow-400 hover:text-yellow-300 flex items-center"
            >
              View All <ChevronRight className="h-4 w-4 ml-0.5" />
            </a>
          )}
        </div>
        <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
          {recentActivity.length > 0 ? (
            <div className="divide-y divide-gray-700">
              {recentActivity.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-center justify-between px-5 py-3.5 hover:bg-gray-750 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        activity.result === "won"
                          ? "bg-green-400"
                          : activity.result === "lost"
                            ? "bg-red-400"
                            : "bg-gray-400"
                      }`}
                    />
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-white text-sm font-medium">
                          {activity.room_name}
                        </span>
                        <span
                          className={`text-xs px-1.5 py-0.5 rounded ${
                            activity.game_type === "blackjack"
                              ? "bg-purple-500/20 text-purple-300"
                              : "bg-blue-500/20 text-blue-300"
                          }`}
                        >
                          {activity.game_type}
                        </span>
                      </div>
                      <div className="flex items-center space-x-1 mt-0.5">
                        <Clock className="h-3 w-3 text-gray-500" />
                        <span className="text-xs text-gray-500">
                          {new Date(activity.finished_at).toLocaleDateString()}{" "}
                          {new Date(activity.finished_at).toLocaleTimeString(
                            [],
                            { hour: "2-digit", minute: "2-digit" },
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                  <span
                    className={`text-sm font-semibold ${
                      activity.result === "won"
                        ? "text-green-400"
                        : activity.result === "lost"
                          ? "text-red-400"
                          : "text-gray-400"
                    }`}
                  >
                    {activity.net_chips > 0 ? "+" : ""}
                    {activity.net_chips.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Target className="h-10 w-10 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400">No games played yet</p>
              <p className="text-gray-500 text-sm mt-1">
                Jump into a game to start building your profile
              </p>
            </div>
          )}
        </div>
      </motion.div>

      {/* Footer disclaimer */}
      <p className="text-center text-gray-600 text-xs pb-4">
        🎯 Virtual chips only — No real money gambling
      </p>
    </div>
  );
};

export default Profile;
