import React from 'react';
import { motion } from 'framer-motion';
import { Card as CardType } from '../types';

interface CardProps {
  card: CardType | null;
  faceDown?: boolean;
  className?: string;
  onClick?: () => void;
  animate?: boolean;
}

const Card: React.FC<CardProps> = ({ 
  card, 
  faceDown = false, 
  className = '', 
  onClick,
  animate = true 
}) => {
  const suitSymbols = {
    hearts: '♥',
    diamonds: '♦',
    clubs: '♣',
    spades: '♠',
  };

  const suitColors = {
    hearts: 'text-red-500',
    diamonds: 'text-red-500',
    clubs: 'text-gray-800',
    spades: 'text-gray-800',
  };

  const cardContent = () => {
    if (faceDown || !card) {
      return (
        <div className="w-full h-full bg-gradient-to-br from-blue-900 to-blue-700 rounded-lg border-2 border-blue-600 flex items-center justify-center">
          <div className="w-8 h-8 bg-blue-600 rounded-full opacity-50"></div>
        </div>
      );
    }

    return (
      <div className={`w-full h-full bg-white rounded-lg border-2 border-gray-300 shadow-md flex flex-col justify-between p-2 ${onClick ? 'cursor-pointer hover:shadow-lg' : ''}`}>
        {/* Top left */}
        <div className={`text-sm font-bold ${suitColors[card.suit]} leading-none`}>
          <div>{card.rank}</div>
          <div>{suitSymbols[card.suit]}</div>
        </div>

        {/* Center suit symbol */}
        <div className={`text-2xl ${suitColors[card.suit]} self-center`}>
          {suitSymbols[card.suit]}
        </div>

        {/* Bottom right (rotated) */}
        <div className={`text-sm font-bold ${suitColors[card.suit]} leading-none self-end transform rotate-180`}>
          <div>{card.rank}</div>
          <div>{suitSymbols[card.suit]}</div>
        </div>
      </div>
    );
  };

  if (animate) {
    return (
      <motion.div
        className={`w-16 h-24 ${className}`}
        onClick={onClick}
        initial={{ scale: 0, rotateY: 180 }}
        animate={{ scale: 1, rotateY: 0 }}
        transition={{ 
          duration: 0.5,
          type: "spring",
          stiffness: 200,
          damping: 20
        }}
        whileHover={onClick ? { scale: 1.05 } : {}}
        whileTap={onClick ? { scale: 0.95 } : {}}
      >
        {cardContent()}
      </motion.div>
    );
  }

  return (
    <div className={`w-16 h-24 ${className}`} onClick={onClick}>
      {cardContent()}
    </div>
  );
};

export default Card;