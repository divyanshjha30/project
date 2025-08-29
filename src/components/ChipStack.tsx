import React from 'react';
import { motion } from 'framer-motion';

interface ChipStackProps {
  amount: number;
  size?: 'small' | 'medium' | 'large';
  animate?: boolean;
  onClick?: () => void;
}

const ChipStack: React.FC<ChipStackProps> = ({ 
  amount, 
  size = 'medium', 
  animate = true,
  onClick 
}) => {
  const getChipColor = (value: number) => {
    if (value >= 1000) return 'bg-purple-600 border-purple-700';
    if (value >= 500) return 'bg-orange-500 border-orange-600';
    if (value >= 100) return 'bg-green-600 border-green-700';
    if (value >= 25) return 'bg-blue-600 border-blue-700';
    if (value >= 5) return 'bg-red-600 border-red-700';
    return 'bg-gray-600 border-gray-700';
  };

  const getSize = () => {
    switch (size) {
      case 'small': return 'w-8 h-8 text-xs';
      case 'large': return 'w-16 h-16 text-lg';
      default: return 'w-12 h-12 text-sm';
    }
  };

  const chipCount = Math.min(Math.floor(amount / 5) || 1, 8);
  const chips = Array.from({ length: chipCount }, (_, i) => i);

  const formatAmount = (amount: number) => {
    if (amount >= 1000000) return `${(amount / 1000000).toFixed(1)}M`;
    if (amount >= 1000) return `${(amount / 1000).toFixed(1)}K`;
    return amount.toString();
  };

  return (
    <div className={`relative ${onClick ? 'cursor-pointer' : ''}`} onClick={onClick}>
      {chips.map((_, index) => {
        const offset = index * 2;
        return (
          <motion.div
            key={index}
            className={`
              absolute rounded-full border-4 flex items-center justify-center font-bold text-white
              ${getChipColor(amount)} ${getSize()}
            `}
            style={{ 
              bottom: offset,
              zIndex: chipCount - index,
            }}
            initial={animate ? { scale: 0, y: -20 } : {}}
            animate={animate ? { scale: 1, y: 0 } : {}}
            transition={animate ? { 
              delay: index * 0.1,
              type: "spring",
              stiffness: 300,
              damping: 20
            } : {}}
            whileHover={onClick ? { scale: 1.1 } : {}}
          >
            {index === chipCount - 1 && (
              <span className="text-center leading-tight">
                {formatAmount(amount)}
              </span>
            )}
          </motion.div>
        );
      })}
      <div className={`${getSize()} opacity-0`}></div>
    </div>
  );
};

export default ChipStack;