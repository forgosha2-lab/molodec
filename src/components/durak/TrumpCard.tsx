import { Card as CardType } from '@/shared/schema';
import { Card } from './Card';

interface TrumpCardProps {
  card: CardType | null;
}

export function TrumpCard({ card }: TrumpCardProps) {
  if (!card) return null;

  return (
    <div className="relative" data-testid="trump-card-container">
      <div className="absolute" style={{ transform: 'rotate(90deg)', transformOrigin: 'center' }}>
        <Card card={card} faceUp={true} disabled />
      </div>
      <div className="w-[140px] h-[100px]" />
    </div>
  );
}

