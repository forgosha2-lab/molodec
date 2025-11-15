import { Badge } from '@/components/ui/badge';

interface DeckProps {
  cardsRemaining: number;
}

export function Deck({ cardsRemaining }: DeckProps) {
  return (
    <div className="relative flex flex-col items-center gap-2" data-testid="deck-container">
      {cardsRemaining > 0 ? (
        <>
          <div className="relative">
            {[...Array(Math.min(3, cardsRemaining))].map((_, i) => (
              <div
                key={i}
                className="absolute w-[100px] h-[140px] bg-card-back rounded-lg shadow-lg border-4 border-gray-200"
                style={{
                  left: `${i * 2}px`,
                  top: `${i * 2}px`,
                  zIndex: 3 - i,
                }}
              >
                <svg className="w-full h-full" viewBox="0 0 100 140">
                  <defs>
                    <pattern id="deck-diamond" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
                      <rect width="10" height="10" fill="#dc2626" />
                      <rect x="10" y="0" width="10" height="10" fill="#991b1b" />
                      <rect x="0" y="10" width="10" height="10" fill="#991b1b" />
                      <rect x="10" y="10" width="10" height="10" fill="#dc2626" />
                    </pattern>
                  </defs>
                  <rect width="100" height="140" fill="url(#deck-diamond)" />
                  <ellipse cx="50" cy="70" rx="30" ry="40" fill="none" stroke="#fca5a5" strokeWidth="2" />
                  <ellipse cx="50" cy="70" rx="20" ry="30" fill="none" stroke="#fca5a5" strokeWidth="1.5" />
                </svg>
              </div>
            ))}
          </div>
          <Badge variant="secondary" className="mt-14" data-testid="deck-count">
            {cardsRemaining} {cardsRemaining === 1 ? 'карта' : cardsRemaining < 5 ? 'карты' : 'карт'}
          </Badge>
        </>
      ) : (
        <div className="w-[100px] h-[140px] rounded-lg border-2 border-dashed border-muted flex items-center justify-center">
          <span className="text-muted-foreground text-sm">Пусто</span>
        </div>
      )}
    </div>
  );
}

