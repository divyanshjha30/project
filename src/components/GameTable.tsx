import React from 'react';
import { motion } from 'framer-motion';
import { RoomPlayer } from '../types';
import Card from './Card';
import ChipStack from './ChipStack';

interface GameTableProps {
  players: RoomPlayer[];
  gameType: 'poker' | 'blackjack';
  currentPlayer?: number;
  pot?: number;
  communityCards?: any[];
  dealerCards?: any[];
  className?: string;
}

const GameTable: React.FC<GameTableProps> = ({
  players,
  gameType,
  currentPlayer,
  pot = 0,
  communityCards = [],
  dealerCards = [],
  className = ''
}) => {
  const getPlayerPosition = (seatIndex: number, totalSeats: number) => {
    const angle = (seatIndex / totalSeats) * 2 * Math.PI - Math.PI / 2;
    const radius = gameType === 'poker' ? 200 : 180;
    
    return {
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
    };
  };

  const maxSeats = gameType === 'poker' ? 8 : 6;

  return (
    <div className={`relative w-full h-full min-h-[600px] ${className}`}>
      {/* Table background */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-96 h-64 bg-green-800 rounded-full border-8 border-yellow-600 shadow-2xl flex items-center justify-center">
          {/* Felt texture overlay */}
          <div className="absolute inset-0 bg-gradient-radial from-green-700 to-green-900 rounded-full opacity-80"></div>
          
          {/* Center content */}
          <div className="relative z-10 text-center">
            {gameType === 'poker' && pot > 0 && (
              <motion.div
                className="mb-4"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <div className="text-yellow-300 text-sm font-semibold mb-2">POT</div>
                <ChipStack amount={pot} size="large" />
              </motion.div>
            )}
            
            {communityCards.length > 0 && (
              <motion.div
                className="flex gap-2 justify-center"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                {communityCards.map((card, index) => (
                  <Card key={index} card={card} animate />
                ))}
              </motion.div>
            )}

            {gameType === 'blackjack' && dealerCards.length > 0 && (
              <div className="text-center">
                <div className="text-white text-sm mb-2">Dealer</div>
                <div className="flex gap-1 justify-center">
                  {dealerCards.map((card, index) => (
                    <Card key={index} card={card} animate />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Player positions */}
      {players.map((player) => {
        const position = getPlayerPosition(player.seat_index, maxSeats);
        const isCurrentPlayer = currentPlayer === player.seat_index;
        
        return (
          <motion.div
            key={player.id}
            className="absolute"
            style={{
              left: `calc(50% + ${position.x}px - 60px)`,
              top: `calc(50% + ${position.y}px - 40px)`,
            }}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            <div className={`
              relative bg-gray-800 rounded-lg p-3 border-2 min-w-[120px]
              ${isCurrentPlayer ? 'border-yellow-400 shadow-lg shadow-yellow-400/50' : 'border-gray-600'}
            `}>
              {/* Player info */}
              <div className="text-center mb-2">
                <div className="text-white text-sm font-semibold truncate">
                  {player.user.display_name}
                </div>
                <div className="text-yellow-300 text-xs">
                  {player.chip_count} chips
                </div>
              </div>

              {/* Player cards */}
              {player.user_id && (
                <div className="flex justify-center gap-1 mb-2">
                  {/* In a real game, this would show actual cards */}
                  <Card card={null} faceDown animate={false} className="w-12 h-16" />
                  <Card card={null} faceDown animate={false} className="w-12 h-16" />
                </div>
              )}

              {/* Current bet */}
              {player.current_bet > 0 && (
                <motion.div
                  className="absolute -top-8 left-1/2 transform -translate-x-1/2"
                  initial={{ scale: 0, y: 10 }}
                  animate={{ scale: 1, y: 0 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <ChipStack amount={player.current_bet} size="small" />
                </motion.div>
              )}

              {/* Player status indicators */}
              {player.has_folded && (
                <div className="absolute inset-0 bg-black bg-opacity-50 rounded-lg flex items-center justify-center">
                  <span className="text-red-400 text-xs font-bold">FOLDED</span>
                </div>
              )}

              {!player.is_ready && (
                <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2">
                  <div className="bg-yellow-600 text-black text-xs px-2 py-1 rounded">
                    NOT READY
                  </div>
                </div>
              )}
            </div>

            {/* Current player indicator */}
            {isCurrentPlayer && (
              <motion.div
                className="absolute -top-3 -right-3 w-6 h-6 bg-yellow-400 rounded-full border-2 border-white"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
              />
            )}
          </motion.div>
        );
      })}

      {/* Empty seats */}
      {Array.from({ length: maxSeats - players.length }, (_, index) => {
        const seatIndex = index + players.length;
        const position = getPlayerPosition(seatIndex, maxSeats);
        
        return (
          <div
            key={`empty-${seatIndex}`}
            className="absolute"
            style={{
              left: `calc(50% + ${position.x}px - 40px)`,
              top: `calc(50% + ${position.y}px - 30px)`,
            }}
          >
            <div className="w-20 h-16 border-2 border-dashed border-gray-600 rounded-lg flex items-center justify-center">
              <span className="text-gray-500 text-xs">Empty</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default GameTable;