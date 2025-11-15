import { Card } from "@/shared/uno-schema";
import { UnoCard } from "./UnoCard";
import { motion } from "framer-motion";

interface PlayerHandProps {
  cards: Card[];
  onCardClick: (card: Card) => void;
  currentColor: string | null;
  topCard: Card | null;
  selectedCardId: string | null;
}

export function PlayerHand({ cards, onCardClick, currentColor, topCard, selectedCardId }: PlayerHandProps) {
  const isCardPlayable = (card: Card): boolean => {
    if (!topCard) return true;

    if (card.type === 'wild' || card.type === 'wild_draw4') {
      return true;
    }

    const matchColor = currentColor || topCard.color;
    if (card.color === matchColor && matchColor !== 'wild') {
      return true;
    }

    if (card.type === topCard.type && card.type !== 'number') {
      return true;
    }

    if (card.type === 'number' && topCard.type === 'number' && card.value === topCard.value) {
      return true;
    }

    return false;
  };

  const getRotation = (index: number, total: number) => {
    if (total === 1) return 0;
    const maxRotation = Math.min(total * 2, 20);
    const step = maxRotation / (total - 1);
    return -maxRotation / 2 + step * index;
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 pb-4 px-2 md:pb-6 md:px-4">
      <div className="flex justify-center items-end">
        <div className="relative flex items-end" style={{ height: '140px' }}>
          {cards.map((card, index) => {
            const rotation = getRotation(index, cards.length);
            const isPlayable = isCardPlayable(card);
            const isSelected = selectedCardId === card.id;
            
            return (
              <motion.div
                key={card.id}
                className="absolute"
                style={{
                  left: `${index * 40}px`,
                  zIndex: isSelected ? 100 : cards.length - index,
                }}
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: index * 0.05 }}
              >
                <UnoCard
                  card={card}
                  onClick={() => isPlayable && onCardClick(card)}
                  isPlayable={isPlayable}
                  isSelected={isSelected}
                  rotation={rotation}
                  size="medium"
                />
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

