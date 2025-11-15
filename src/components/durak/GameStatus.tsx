import { Badge } from '@/components/ui/badge';
import { SuitType } from '@/shared/schema';

interface GameStatusProps {
  phase: string;
  trumpSuit: SuitType | null;
  currentMessage: string;
}

export function GameStatus({ phase, trumpSuit, currentMessage }: GameStatusProps) {
  const getPhaseText = () => {
    switch (phase) {
      case 'dealing':
        return 'Раздача карт...';
      case 'attacking':
        return 'Атака';
      case 'defending':
        return 'Защита';
      case 'ended':
        return 'Игра окончена';
      default:
        return '';
    }
  };

  const getSuitColor = (suit: SuitType) => {
    return suit === '♥' || suit === '♦' ? 'text-red-600' : 'text-gray-900';
  };

  return (
    <div className="flex items-center gap-4 justify-center flex-wrap" data-testid="game-status">
      <Badge variant="outline" className="text-base px-4 py-2">
        {getPhaseText()}
      </Badge>
      
      {trumpSuit && (
        <Badge variant="secondary" className="text-base px-4 py-2" data-testid="trump-suit-indicator">
          Козырь: <span className={`ml-1 text-2xl ${getSuitColor(trumpSuit)}`}>{trumpSuit}</span>
        </Badge>
      )}
      
      {currentMessage && (
        <div className="text-sm text-muted-foreground" data-testid="game-message">
          {currentMessage}
        </div>
      )}
    </div>
  );
}

