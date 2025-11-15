import { Card as CardType, SuitType } from '@/shared/schema';
import { motion } from 'framer-motion';

interface CardProps {
  card: CardType;
  faceUp?: boolean;
  selected?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
  style?: React.CSSProperties;
}

export function Card({ 
  card, 
  faceUp = true, 
  selected = false, 
  disabled = false,
  onClick,
  className = '',
  style = {}
}: CardProps) {
  const isRed = card.suit === '♥' || card.suit === '♦';
  
  return (
    <motion.div
      className={`
        relative bg-white rounded-lg shadow-lg cursor-pointer
        ${selected ? 'ring-4 ring-primary shadow-xl' : ''}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:-translate-y-2 hover:shadow-2xl'}
        ${className}
      `}
      style={{
        width: '100px',
        height: '140px',
        ...style,
      }}
      onClick={disabled ? undefined : onClick}
      whileHover={disabled ? {} : { y: -8 }}
      whileTap={disabled ? {} : { scale: 0.95 }}
      transition={{ duration: 0.2 }}
      data-testid={faceUp ? `card-${card.rank}${card.suit}` : 'card-back'}
    >
      {faceUp ? (
        <div className="w-full h-full flex flex-col items-center justify-center p-2 border-4 border-gray-200 rounded-lg">
          <div className={`text-4xl font-bold ${isRed ? 'text-red-600' : 'text-gray-900'}`}>
            {card.rank}
          </div>
          <div className={`text-5xl ${isRed ? 'text-red-600' : 'text-gray-900'}`}>
            {card.suit}
          </div>
          <div className="absolute top-1 left-2 flex flex-col items-center">
            <span className={`text-sm font-bold ${isRed ? 'text-red-600' : 'text-gray-900'}`}>
              {card.rank}
            </span>
            <span className={`text-lg ${isRed ? 'text-red-600' : 'text-gray-900'}`}>
              {card.suit}
            </span>
          </div>
          <div className="absolute bottom-1 right-2 flex flex-col items-center rotate-180">
            <span className={`text-sm font-bold ${isRed ? 'text-red-600' : 'text-gray-900'}`}>
              {card.rank}
            </span>
            <span className={`text-lg ${isRed ? 'text-red-600' : 'text-gray-900'}`}>
              {card.suit}
            </span>
          </div>
        </div>
      ) : (
        <div className="w-full h-full bg-card-back rounded-lg border-4 border-gray-200">
          <svg className="w-full h-full" viewBox="0 0 100 140">
            <defs>
              <pattern id="diamond-pattern" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
                <rect width="10" height="10" fill="#dc2626" />
                <rect x="10" y="0" width="10" height="10" fill="#991b1b" />
                <rect x="0" y="10" width="10" height="10" fill="#991b1b" />
                <rect x="10" y="10" width="10" height="10" fill="#dc2626" />
              </pattern>
            </defs>
            <rect width="100" height="140" fill="url(#diamond-pattern)" />
            <ellipse cx="50" cy="70" rx="30" ry="40" fill="none" stroke="#fca5a5" strokeWidth="2" />
            <ellipse cx="50" cy="70" rx="20" ry="30" fill="none" stroke="#fca5a5" strokeWidth="1.5" />
          </svg>
        </div>
      )}
    </motion.div>
  );
}

