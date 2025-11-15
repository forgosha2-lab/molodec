import { Card as CardType } from '@/shared/schema';
import { Card } from './Card';

interface PlayerHandProps {
  cards: CardType[];
  selectedCards: string[];
  onCardClick: (cardId: string) => void;
  canPlay: boolean;
}

export function PlayerHand({ cards, selectedCards, onCardClick, canPlay }: PlayerHandProps) {
  return (
    <div className="flex flex-col items-center gap-4" data-testid="player-hand">
      <div className="text-sm font-medium">Ваши карты</div>
      <div className="flex gap-2 flex-wrap justify-center max-w-4xl">
        {cards.length === 0 ? (
          <div className="text-muted-foreground text-sm">У вас нет карт</div>
        ) : (
          cards.map((card, index) => (
            <Card
              key={card.id}
              card={card}
              selected={selectedCards.includes(card.id)}
              disabled={!canPlay}
              onClick={() => onCardClick(card.id)}
              style={{
                zIndex: cards.length - index,
              }}
            />
          ))
        )}
      </div>
    </div>
  );
}

