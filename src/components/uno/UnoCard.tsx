import { Card, CardColor } from "@/shared/uno-schema";
import { motion } from "framer-motion";
import { 
  RotateCcw, 
  PlusCircle, 
  Sparkles,
  X 
} from "lucide-react";

interface UnoCardProps {
  card: Card;
  onClick?: () => void;
  isPlayable?: boolean;
  isSelected?: boolean;
  isFaceDown?: boolean;
  rotation?: number;
  className?: string;
  size?: 'small' | 'medium' | 'large';
}

const colorClasses: Record<CardColor, string> = {
  red: 'bg-red-500 border-red-700',
  yellow: 'bg-yellow-400 border-yellow-600',
  green: 'bg-green-500 border-green-700',
  blue: 'bg-blue-500 border-blue-700',
  wild: 'bg-gradient-to-br from-red-500 via-yellow-400 via-green-500 to-blue-500 border-gray-700',
};

const glowClasses: Record<CardColor, string> = {
  red: 'shadow-red-500/50 shadow-lg',
  yellow: 'shadow-yellow-400/50 shadow-lg',
  green: 'shadow-green-500/50 shadow-lg',
  blue: 'shadow-blue-500/50 shadow-lg',
  wild: 'shadow-xl',
};

export function UnoCard({ 
  card, 
  onClick, 
  isPlayable = false, 
  isSelected = false,
  isFaceDown = false,
  rotation = 0,
  className = '',
  size = 'medium'
}: UnoCardProps) {
  const sizeClasses = {
    small: 'w-16 h-24',
    medium: 'w-20 h-30',
    large: 'w-28 h-42',
  };

  const getCardIcon = () => {
    switch (card.type) {
      case 'skip':
        return <X className="w-12 h-12 md:w-16 md:h-16" />;
      case 'reverse':
        return <RotateCcw className="w-12 h-12 md:w-16 md:h-16" />;
      case 'draw2':
        return (
          <div className="flex flex-col items-center">
            <PlusCircle className="w-10 h-10 md:w-12 md:h-12" />
            <span className="text-4xl md:text-5xl font-black mt-1">2</span>
          </div>
        );
      case 'wild':
        return <Sparkles className="w-12 h-12 md:w-16 md:h-16" />;
      case 'wild_draw4':
        return (
          <div className="flex flex-col items-center">
            <Sparkles className="w-10 h-10 md:w-12 md:h-12" />
            <span className="text-4xl md:text-5xl font-black mt-1">4</span>
          </div>
        );
      default:
        return null;
    }
  };

  if (isFaceDown) {
    return (
      <motion.div
        className={`${sizeClasses[size]} rounded-2xl border-4 border-gray-700 bg-gradient-to-br from-gray-800 to-gray-900 cursor-pointer flex items-center justify-center transition-all ${className}`}
        onClick={onClick}
        whileHover={onClick ? { y: -8, scale: 1.05 } : {}}
        whileTap={onClick ? { scale: 0.95 } : {}}
        style={{ rotate: rotation }}
      >
        <div className="text-6xl font-black text-white opacity-20">UNO</div>
      </motion.div>
    );
  }

  return (
    <motion.div
      className={`
        ${sizeClasses[size]} 
        rounded-2xl 
        border-4 
        ${colorClasses[card.color]} 
        ${isPlayable ? 'cursor-pointer' : 'cursor-not-allowed opacity-70'}
        ${isSelected ? `${glowClasses[card.color]} -translate-y-6 scale-105` : ''}
        flex items-center justify-center
        relative
        overflow-hidden
        transition-all
        ${className}
      `}
      onClick={isPlayable ? onClick : undefined}
      whileHover={isPlayable ? { y: -8 } : {}}
      whileTap={isPlayable ? { scale: 0.95 } : {}}
      style={{ rotate: rotation }}
    >
      <div className="absolute inset-0 m-3 rounded-xl bg-white flex items-center justify-center">
        <div className={`w-full h-full rounded-lg ${colorClasses[card.color]} flex items-center justify-center text-white`}>
          {card.type === 'number' && card.value !== null ? (
            <>
              <span className="absolute top-1 left-1 text-xl md:text-2xl font-black">{card.value}</span>
              <span className="absolute bottom-1 right-1 text-xl md:text-2xl font-black rotate-180">{card.value}</span>
              <span className="text-6xl md:text-8xl font-black">{card.value}</span>
            </>
          ) : (
            <div className="flex flex-col items-center">
              {getCardIcon()}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

