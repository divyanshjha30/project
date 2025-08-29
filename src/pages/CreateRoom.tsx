import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  Users, 
  Lock, 
  Globe, 
  Crown, 
  Play,
  Coins
} from 'lucide-react';
import { useGame } from '../contexts/GameContext';
import toast from 'react-hot-toast';

const CreateRoom: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    gameType: 'poker' as 'poker' | 'blackjack',
    maxPlayers: 6,
    minBet: 10,
    isPrivate: false,
  });
  const [isLoading, setIsLoading] = useState(false);
  const { createRoom } = useGame();
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : 
               type === 'number' ? parseInt(value) : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error('Please enter a room name');
      return;
    }

    if (formData.minBet < 1) {
      toast.error('Minimum bet must be at least 1 chip');
      return;
    }

    setIsLoading(true);
    const room = await createRoom(
      formData.name,
      formData.gameType,
      formData.maxPlayers,
      formData.minBet,
      formData.isPrivate
    );
    setIsLoading(false);

    if (room) {
      // Join the room automatically as host
      navigate(`/room/${room.id}`);
    }
  };

  const gameTypeOptions = [
    {
      value: 'poker',
      label: 'Texas Hold\'em Poker',
      description: 'Classic poker with community cards',
      icon: Crown,
      color: 'border-blue-500 bg-blue-500/10',
      maxPlayersRange: { min: 2, max: 8 }
    },
    {
      value: 'blackjack',
      label: 'Blackjack',
      description: 'Beat the dealer to 21',
      icon: Play,
      color: 'border-green-500 bg-green-500/10',
      maxPlayersRange: { min: 1, max: 6 }
    }
  ];

  const selectedGameType = gameTypeOptions.find(g => g.value === formData.gameType);

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="flex items-center space-x-4 mb-8"
      >
        <button
          onClick={() => navigate('/dashboard')}
          className="p-2 text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-6 w-6" />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-white">Create New Room</h1>
          <p className="text-gray-400">Set up a game for you and your friends</p>
        </div>
      </motion.div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Form */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="bg-gray-800 border border-gray-700 rounded-2xl p-8"
        >
          <h2 className="text-xl font-bold text-white mb-6">Room Settings</h2>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Room Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-2">
                Room Name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                value={formData.name}
                onChange={handleChange}
                placeholder="Enter room name"
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/20 transition-all duration-200"
                required
              />
            </div>

            {/* Game Type */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-3">
                Game Type
              </label>
              <div className="grid grid-cols-1 gap-3">
                {gameTypeOptions.map((option) => {
                  const Icon = option.icon;
                  return (
                    <label
                      key={option.value}
                      className={`
                        relative cursor-pointer p-4 border-2 rounded-lg transition-all duration-200
                        ${formData.gameType === option.value 
                          ? `${option.color} border-opacity-100` 
                          : 'border-gray-600 hover:border-gray-500'
                        }
                      `}
                    >
                      <input
                        type="radio"
                        name="gameType"
                        value={option.value}
                        checked={formData.gameType === option.value}
                        onChange={handleChange}
                        className="sr-only"
                      />
                      <div className="flex items-center space-x-3">
                        <Icon className="h-6 w-6 text-yellow-400" />
                        <div>
                          <div className="font-semibold text-white">{option.label}</div>
                          <div className="text-sm text-gray-400">{option.description}</div>
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Max Players */}
            <div>
              <label htmlFor="maxPlayers" className="block text-sm font-medium text-gray-300 mb-2">
                Maximum Players
              </label>
              <select
                id="maxPlayers"
                name="maxPlayers"
                value={formData.maxPlayers}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/20 transition-all duration-200"
              >
                {Array.from(
                  { length: (selectedGameType?.maxPlayersRange.max || 8) - (selectedGameType?.maxPlayersRange.min || 2) + 1 },
                  (_, i) => (selectedGameType?.maxPlayersRange.min || 2) + i
                ).map(num => (
                  <option key={num} value={num}>
                    {num} players
                  </option>
                ))}
              </select>
            </div>

            {/* Minimum Bet */}
            <div>
              <label htmlFor="minBet" className="block text-sm font-medium text-gray-300 mb-2">
                Minimum Bet
              </label>
              <div className="relative">
                <Coins className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  id="minBet"
                  name="minBet"
                  type="number"
                  min="1"
                  max="1000"
                  value={formData.minBet}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/20 transition-all duration-200"
                  required
                />
              </div>
            </div>

            {/* Privacy Setting */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-3">
                Room Privacy
              </label>
              <div className="grid grid-cols-1 gap-3">
                <label className={`
                  relative cursor-pointer p-4 border-2 rounded-lg transition-all duration-200
                  ${!formData.isPrivate 
                    ? 'border-green-500 bg-green-500/10' 
                    : 'border-gray-600 hover:border-gray-500'
                  }
                `}>
                  <input
                    type="radio"
                    name="isPrivate"
                    checked={!formData.isPrivate}
                    onChange={() => setFormData(prev => ({ ...prev, isPrivate: false }))}
                    className="sr-only"
                  />
                  <div className="flex items-center space-x-3">
                    <Globe className="h-5 w-5 text-green-400" />
                    <div>
                      <div className="font-semibold text-white">Public Room</div>
                      <div className="text-sm text-gray-400">Anyone can join</div>
                    </div>
                  </div>
                </label>

                <label className={`
                  relative cursor-pointer p-4 border-2 rounded-lg transition-all duration-200
                  ${formData.isPrivate 
                    ? 'border-yellow-500 bg-yellow-500/10' 
                    : 'border-gray-600 hover:border-gray-500'
                  }
                `}>
                  <input
                    type="radio"
                    name="isPrivate"
                    checked={formData.isPrivate}
                    onChange={() => setFormData(prev => ({ ...prev, isPrivate: true }))}
                    className="sr-only"
                  />
                  <div className="flex items-center space-x-3">
                    <Lock className="h-5 w-5 text-yellow-400" />
                    <div>
                      <div className="font-semibold text-white">Private Room</div>
                      <div className="text-sm text-gray-400">Invite code required</div>
                    </div>
                  </div>
                </label>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-4 bg-gradient-to-r from-yellow-600 to-yellow-500 text-black font-bold rounded-lg hover:from-yellow-500 hover:to-yellow-400 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-yellow-500/25"
            >
              {isLoading ? 'Creating Room...' : 'Create Room'}
            </button>
          </form>
        </motion.div>

        {/* Preview */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="bg-gray-800 border border-gray-700 rounded-2xl p-8"
        >
          <h2 className="text-xl font-bold text-white mb-6">Room Preview</h2>
          
          <div className="space-y-6">
            {/* Game Preview */}
            <div className="bg-gray-700 rounded-lg p-6">
              <div className="flex items-center space-x-3 mb-4">
                {selectedGameType && (
                  <>
                    <selectedGameType.icon className="h-8 w-8 text-yellow-400" />
                    <div>
                      <h3 className="text-lg font-bold text-white">{selectedGameType.label}</h3>
                      <p className="text-sm text-gray-400">{selectedGameType.description}</p>
                    </div>
                  </>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-400">Players:</span>
                  <span className="text-white ml-2">{formData.maxPlayers}</span>
                </div>
                <div>
                  <span className="text-gray-400">Min Bet:</span>
                  <span className="text-yellow-400 ml-2">{formData.minBet} chips</span>
                </div>
              </div>
            </div>

            {/* Room Info */}
            <div className="space-y-4">
              <div className="flex justify-between items-center p-4 bg-gray-700 rounded-lg">
                <div className="flex items-center space-x-2">
                  {formData.isPrivate ? (
                    <Lock className="h-5 w-5 text-yellow-400" />
                  ) : (
                    <Globe className="h-5 w-5 text-green-400" />
                  )}
                  <span className="text-white font-medium">
                    {formData.isPrivate ? 'Private Room' : 'Public Room'}
                  </span>
                </div>
                {formData.isPrivate && (
                  <span className="text-xs text-gray-400">Invite code will be generated</span>
                )}
              </div>

              <div className="p-4 bg-gray-700 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <Users className="h-5 w-5 text-blue-400" />
                  <span className="text-white font-medium">Player Setup</span>
                </div>
                <div className="text-sm text-gray-400">
                  Each player brings up to 1,000 chips to the table
                </div>
              </div>
            </div>

            {/* Rules Preview */}
            <div className="p-4 bg-yellow-600/10 border border-yellow-600 rounded-lg">
              <h4 className="text-yellow-400 font-semibold mb-2">Game Rules</h4>
              <div className="text-sm text-gray-300 space-y-1">
                {formData.gameType === 'poker' ? (
                  <>
                    <p>• Standard Texas Hold'em rules</p>
                    <p>• Small/big blind structure</p>
                    <p>• Community cards: flop, turn, river</p>
                    <p>• Best 5-card hand wins</p>
                  </>
                ) : (
                  <>
                    <p>• Standard blackjack rules</p>
                    <p>• Hit, stand, double, split available</p>
                    <p>• Dealer hits on soft 17</p>
                    <p>• 3:2 blackjack payout</p>
                  </>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Important Notice */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.3 }}
        className="mt-8 p-6 bg-gray-800 border border-yellow-600 rounded-xl"
      >
        <div className="flex items-start space-x-3">
          <Crown className="h-6 w-6 text-yellow-400 mt-1" />
          <div>
            <h3 className="text-yellow-400 font-semibold mb-2">Virtual Entertainment Only</h3>
            <p className="text-gray-300 text-sm">
              This platform uses virtual chips for entertainment purposes only. 
              No real money is involved, and chips have no monetary value.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default CreateRoom;