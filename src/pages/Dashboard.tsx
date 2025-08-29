import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Plus,
  Users,
  Play,
  Crown,
  TrendingUp,
  Clock,
  Trophy,
} from "lucide-react";
import { useGame } from "../contexts/GameContext";
import { useAuth } from "../contexts/AuthContext";
import toast from "react-hot-toast";

const Dashboard: React.FC = () => {
  const { rooms, fetchRooms, joinRoom, loading } = useGame();
  const { signOut, user } = useAuth();
  const navigate = useNavigate();
  const [loadingTimeout, setLoadingTimeout] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadRooms = async () => {
      if (isMounted) {
        await fetchRooms();
      }
    };

    loadRooms();

    // Set a timeout for loading
    const timer = setTimeout(() => {
      if (loading && isMounted) setLoadingTimeout(true);
    }, 10000);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, []); // Only run once on mount

  const handleQuickJoin = async (roomId: string) => {
    try {
      console.log("Attempting to join room:", roomId);
      const success = await joinRoom(roomId);
      console.log("Join room result:", success);

      if (success) {
        console.log("Navigating to room:", roomId);
        // Use React Router navigate to avoid page reload
        navigate(`/room/${roomId}`);
      }
    } catch (error) {
      console.error("Error joining room:", error);
      toast.error("Failed to join room");
    }
  };

  const stats = [
    {
      label: "Total Games",
      value: user?.total_games || 0,
      icon: Play,
      color: "text-blue-400",
    },
    {
      label: "Games Won",
      value: user?.games_won || 0,
      icon: Trophy,
      color: "text-yellow-400",
    },
    {
      label: "Win Rate",
      value: user?.total_games
        ? `${Math.round((user.games_won / user.total_games) * 100)}%`
        : "0%",
      icon: TrendingUp,
      color: "text-green-400",
    },
    {
      label: "Chip Balance",
      value: user?.chip_balance?.toLocaleString() || "0",
      icon: Crown,
      color: "text-yellow-400",
    },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {loadingTimeout && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-60 z-50">
          <div className="bg-gray-800 border border-yellow-600 rounded-xl p-8 text-center shadow-2xl">
            <h2 className="text-2xl font-bold text-white mb-4">
              Loading is taking too long
            </h2>
            <p className="text-gray-300 mb-6">
              Would you like to try again or sign out?
            </p>
            <div className="flex justify-center space-x-4">
              <button
                className="px-6 py-3 bg-yellow-600 text-black rounded-lg font-semibold hover:bg-yellow-500 transition-colors"
                onClick={() => {
                  setLoadingTimeout(false);
                  fetchRooms();
                }}
              >
                Try Again
              </button>
              <button
                className="px-6 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-500 transition-colors"
                onClick={async () => {
                  try {
                    await signOut();
                    navigate("/login");
                  } catch (error) {
                    console.error("Error signing out:", error);
                  }
                }}
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Welcome Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center"
      >
        <h1 className="text-4xl font-bold text-white mb-4">
          Welcome back,{" "}
          <span className="text-yellow-400">{user?.display_name}</span>!
        </h1>
        <p className="text-gray-300 text-lg">Ready to play some games?</p>
      </motion.div>

      {/* Stats Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
      >
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="bg-gray-800 border border-gray-700 rounded-xl p-6 hover:border-yellow-600 transition-colors"
            >
              <div className="flex items-center justify-between mb-4">
                <Icon className={`h-6 w-6 ${stat.color}`} />
                <span className={`text-2xl font-bold ${stat.color}`}>
                  {stat.value}
                </span>
              </div>
              <p className="text-gray-400 text-sm">{stat.label}</p>
            </div>
          );
        })}
      </motion.div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="grid grid-cols-1 md:grid-cols-2 gap-6"
      >
        <Link
          to="/create-room"
          className="group bg-gradient-to-r from-yellow-600 to-yellow-500 rounded-xl p-8 hover:from-yellow-500 hover:to-yellow-400 transition-all duration-300 shadow-lg hover:shadow-yellow-500/25"
        >
          <div className="flex items-center space-x-4">
            <div className="bg-black/20 p-3 rounded-lg group-hover:scale-110 transition-transform">
              <Plus className="h-8 w-8 text-black" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-black">Create Room</h3>
              <p className="text-black/80">Start a new game with friends</p>
            </div>
          </div>
        </Link>

        <div className="bg-gray-800 border border-gray-700 rounded-xl p-8 hover:border-yellow-600 transition-colors">
          <div className="flex items-center space-x-4">
            <div className="bg-yellow-600 p-3 rounded-lg">
              <Users className="h-8 w-8 text-black" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-white">Quick Join</h3>
              <p className="text-gray-400">Find and join active games below</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Available Rooms */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.3 }}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">Available Rooms</h2>
          <button
            onClick={fetchRooms}
            disabled={loading}
            className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50"
          >
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        {rooms.length === 0 && !loading ? (
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-12 text-center">
            <Users className="h-16 w-16 text-gray-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">
              No rooms available
            </h3>
            <p className="text-gray-400 mb-6">
              Be the first to create a room and start playing!
            </p>
            <Link
              to="/create-room"
              className="inline-flex items-center px-6 py-3 bg-yellow-600 text-black rounded-lg font-semibold hover:bg-yellow-500 transition-colors"
            >
              <Plus className="h-5 w-5 mr-2" />
              Create Room
            </Link>
          </div>
        ) : (
          <div className="grid gap-4">
            {rooms.map((room, index) => (
              <motion.div
                key={room.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                className="bg-gray-800 border border-gray-700 rounded-xl p-6 hover:border-yellow-600 transition-all duration-300 hover:shadow-lg"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div
                      className={`p-3 rounded-lg ${
                        room.game_type === "poker"
                          ? "bg-blue-600"
                          : "bg-green-600"
                      }`}
                    >
                      {room.game_type === "poker" ? (
                        <Crown className="h-6 w-6 text-white" />
                      ) : (
                        <Play className="h-6 w-6 text-white" />
                      )}
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-white">
                        {room.name}
                      </h3>
                      <div className="flex items-center space-x-4 text-sm text-gray-400">
                        <span className="capitalize">{room.game_type}</span>
                        <span>•</span>
                        <span className="flex items-center">
                          <Users className="h-4 w-4 mr-1" />
                          {room.current_players}/{room.max_players}
                        </span>
                        <span>•</span>
                        <span>Min bet: {room.min_bet} chips</span>
                        {room.is_private && (
                          <>
                            <span>•</span>
                            <span className="text-yellow-400">Private</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <div className="text-right">
                      <div className="flex items-center text-green-400 text-sm">
                        <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                        Waiting
                      </div>
                      <div className="text-gray-400 text-xs flex items-center">
                        <Clock className="h-3 w-3 mr-1" />
                        {new Date(room.created_at).toLocaleTimeString()}
                      </div>
                    </div>
                    <button
                      onClick={() => handleQuickJoin(room.id)}
                      disabled={
                        loading || room.current_players >= room.max_players
                      }
                      className="px-6 py-2 bg-yellow-600 text-black rounded-lg font-semibold hover:bg-yellow-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Join
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default Dashboard;
