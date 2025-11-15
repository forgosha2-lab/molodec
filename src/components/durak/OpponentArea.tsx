import { Player } from '@/shared/schema';
import { Badge } from '@/components/ui/badge';
import { Card } from './Card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface OpponentAreaProps {
  player: Player;
  isActive: boolean;
  isDefender: boolean;
}

export function OpponentArea({ player, isActive, isDefender }: OpponentAreaProps) {
  return (
    <div
      className={`
        flex flex-col items-center gap-2 p-4 rounded-lg transition-all
        ${isActive ? 'ring-2 ring-primary shadow-lg bg-primary/5' : ''}
        ${isDefender ? 'ring-2 ring-destructive shadow-lg bg-destructive/5' : ''}
      `}
      data-testid={`opponent-${player.id}`}
    >
      <div className="flex items-center gap-2">
        <Avatar className="h-8 w-8">
          <AvatarFallback className="text-xs">{player.name[0]}</AvatarFallback>
        </Avatar>
        <div className="flex flex-col">
          <span className="text-sm font-medium">{player.name}</span>
          {player.isOut && (
            <Badge variant="secondary" className="text-xs">Вышел</Badge>
          )}
        </div>
      </div>
      
      <div className="flex gap-1">
        {player.hand.length > 0 ? (
          <>
            {player.hand.slice(0, Math.min(6, player.hand.length)).map((_, index) => (
              <div
                key={index}
                className="relative"
                style={{
                  marginLeft: index === 0 ? 0 : '-40px',
                  zIndex: player.hand.length - index,
                }}
              >
                <Card card={player.hand[0]} faceUp={false} disabled />
              </div>
            ))}
            <Badge 
              variant="outline" 
              className="ml-2 self-center"
              data-testid={`opponent-${player.id}-card-count`}
            >
              {player.hand.length}
            </Badge>
          </>
        ) : (
          <div className="text-muted-foreground text-xs">Нет карт</div>
        )}
      </div>
      
      {isActive && (
        <Badge variant="default" data-testid={`opponent-${player.id}-turn-indicator`}>
          Атакует
        </Badge>
      )}
      {isDefender && (
        <Badge variant="destructive" data-testid={`opponent-${player.id}-defender-indicator`}>
          Защищается
        </Badge>
      )}
    </div>
  );
}

