import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  User, 
  Edit3, 
  Trophy, 
  Target, 
  Calendar,
  Coins,
  TrendingUp,
  Award
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

const Profile: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    display_name: user?.display_name || '',
    username: user?.username || '',
  });

  const handleSave = async () => {
    // In a real implementation, this would call an API to update the user profile
    toast.success('Profile updated successfully!');
    setIsEditing(false);
    refreshUser();
  };

  const stats = [
    {
      label: 'Total Games Played',
      value: user?.total_games || 0,
      icon: Target,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10'
    },
    {
      label: 'Games Won',
      value: user?.games_won || 0,
      icon: Trophy,
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-500/10'
    },
    {
      label: 'Games Lost',
      value: user?.games_lost || 0,
      icon: Award,
      color: 'text-red-400',
      bgColor: 'bg-red-500/10'
    },
    {
      label: 'Win Rate',
      value: user?.total_games ? `${Math.round((user.games_won / user.total_games) * 100)}%` : '0%',
      icon: TrendingUp,
      color: 'text-green-400',
      bgColor: 'bg-green-500/10'
    }
  ];

  const achievements = [
    { name: 'First Game', description: 'Played your first game', earned: (user?.total_games || 0) > 0 },
    { name: 'Winner', description: 'Won your first game', earned: (user?.games_won || 0) > 0 },
    { name: 'High Roller', description: 'Accumulated 50,000+ chips', earned: (user?.chip_balance || 0) >= 50000 },
    { name: 'Veteran', description: 'Played 100+ games', earned: (user?.total_games || 0) >= 100 },
  ];

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-yellow-400"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Profile Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="bg-gradient-to-r from-gray-800 to-gray-700 border border-gray-600 rounded-2xl p-8"
      >
        <div className="flex flex-col md:flex-row items-start md:items-center space-y-6 md:space-y-0 md:space-x-6">
          {/* Avatar */}
          <div className="relative">
            <div className="w-24 h-24 bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center">
              {user.avatar_url ? (
                <img src={user.avatar_url} alt="Avatar" className="w-full h-full rounded-full object-cover" />
              ) : (
                <User className="h-12 w-12 text-black" />
              )}
            </div>
            <div className={`absolute -top-1 -right-1 w-6 h-6 rounded-full border-2 border-gray-800 ${
              user.role === 'admin' ? 'bg-purple-500' : 
              user.role === 'mod' ? 'bg-blue-500' : 'bg-green-500'
            }`}></div>
          </div>

          {/* User Info */}
          <div className="flex-1">
            {isEditing ? (
              <div className="space-y-4">
                <input
                  type="text"
                  value={editData.display_name}
                  onChange={(e) => setEditData(prev => ({ ...prev, display_name: e.target.value }))}
                  className="text-2xl font-bold bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white w-full md:w-auto"
                  placeholder="Display name"
                />
                <input
                  type="text"
                  value={editData.username}
                  onChange={(e) => setEditData(prev => ({ ...prev, username: e.target.value }))}
                  className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-gray-300 w-full md:w-auto"
                  placeholder="Username"
                />
                <div className="flex space-x-3">
                  <button
                    onClick={handleSave}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-500 transition-colors"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setIsEditing(false)}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-500 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center space-x-3 mb-2">
                  <h1 className="text-3xl font-bold text-white">{user.display_name}</h1>
                  <button
                    onClick={() => setIsEditing(true)}
                    className="p-2 text-gray-400 hover:text-yellow-400 transition-colors"
                  >
                    <Edit3 className="h-5 w-5" />
                  </button>
                </div>
                <p className="text-gray-400 text-lg">@{user.username}</p>
                <div className="flex items-center space-x-4 mt-4">
                  <div className={`px-3 py-1 rounded-full text-sm font-semibold ${
                    user.role === 'admin' ? 'bg-purple-600 text-white' :
                    user.role === 'mod' ? 'bg-blue-600 text-white' : 
                    'bg-green-600 text-white'
                  }`}>
                    {user.role.toUpperCase()}
                  </div>
                  <div className="flex items-center text-gray-400 text-sm">
                    <Calendar className="h-4 w-4 mr-1" />
                    Joined {new Date(user.created_at).toLocaleDateString()}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Chip Balance */}
          <div className="bg-gray-700 rounded-xl p-4 text-center">
            <div className="flex items-center justify-center mb-2">
              <Coins className="h-6 w-6 text-yellow-400 mr-2" />
              <span className="text-2xl font-bold text-yellow-400">
                {user.chip_balance.toLocaleString()}
              </span>
            </div>
            <p className="text-gray-400 text-sm">Virtual Chips</p>
          </div>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
      >
        <h2 className="text-2xl font-bold text-white mb-6">Game Statistics</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                className={`bg-gray-800 border border-gray-700 rounded-xl p-6 ${stat.bgColor} hover:border-yellow-600 transition-colors`}
              >
                <div className="flex items-center justify-between mb-4">
                  <Icon className={`h-6 w-6 ${stat.color}`} />
                  <span className={`text-2xl font-bold ${stat.color}`}>
                    {stat.value}
                  </span>
                </div>
                <p className="text-gray-400 text-sm">{stat.label}</p>
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {/* Achievements */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        <h2 className="text-2xl font-bold text-white mb-6">Achievements</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {achievements.map((achievement, index) => (
            <motion.div
              key={achievement.name}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
              className={`p-4 border-2 rounded-xl transition-all duration-300 ${
                achievement.earned
                  ? 'border-yellow-500 bg-yellow-500/10'
                  : 'border-gray-700 bg-gray-800 opacity-50'
              }`}
            >
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-lg ${
                  achievement.earned ? 'bg-yellow-600' : 'bg-gray-700'
                }`}>
                  <Trophy className={`h-5 w-5 ${
                    achievement.earned ? 'text-black' : 'text-gray-400'
                  }`} />
                </div>
                <div>
                  <h3 className={`font-semibold ${
                    achievement.earned ? 'text-yellow-400' : 'text-gray-500'
                  }`}>
                    {achievement.name}
                  </h3>
                  <p className={`text-sm ${
                    achievement.earned ? 'text-gray-300' : 'text-gray-500'
                  }`}>
                    {achievement.description}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Recent Activity */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.3 }}
      >
        <h2 className="text-2xl font-bold text-white mb-6">Recent Activity</h2>
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
          <div className="text-center py-12">
            <Trophy className="h-16 w-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 text-lg">No recent activity</p>
            <p className="text-gray-500 text-sm">Start playing to see your game history here</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Profile;