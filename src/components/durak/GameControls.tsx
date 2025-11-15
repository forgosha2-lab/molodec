import { Button } from '@/components/ui/button';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { HelpCircle, RotateCcw } from 'lucide-react';

interface GameControlsProps {
  onPlayCard: () => void;
  onTake: () => void;
  onPass: () => void;
  onNewGame: (players?: number) => void;
  canPlayCard: boolean;
  canTake: boolean;
  canPass: boolean;
  phase: string;
}

export function GameControls({
  onPlayCard,
  onTake,
  onPass,
  onNewGame,
  canPlayCard,
  canTake,
  canPass,
  phase,
}: GameControlsProps) {
  return (
    <div className="flex gap-4 items-center justify-center flex-wrap">
      <Button
        onClick={onPlayCard}
        disabled={!canPlayCard}
        size="lg"
        data-testid="button-play-card"
      >
        {phase === 'defending' ? 'Отбить' : 'Подкинуть'}
      </Button>
      
      {canTake && (
        <Button
          onClick={onTake}
          variant="destructive"
          size="lg"
          data-testid="button-take"
        >
          Взять карты
        </Button>
      )}
      
      {canPass && (
        <Button
          onClick={onPass}
          variant="secondary"
          size="lg"
          data-testid="button-pass"
        >
          Пас
        </Button>
      )}
      
      <Button
        onClick={() => onNewGame(2)}
        variant="outline"
        size="lg"
        data-testid="button-new-game"
      >
        <RotateCcw className="w-4 h-4 mr-2" />
        Новая игра
      </Button>
      
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="ghost" size="icon" data-testid="button-rules">
            <HelpCircle className="w-5 h-5" />
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Правила игры "Дурак подкидной"</DialogTitle>
            <DialogDescription className="space-y-4 text-left">
              <div>
                <h3 className="font-semibold text-foreground mb-2">Цель игры</h3>
                <p>Избавиться от всех карт. Последний игрок с картами - "дурак".</p>
              </div>
              
              <div>
                <h3 className="font-semibold text-foreground mb-2">Подготовка</h3>
                <p>Колода из 36 карт (от 6 до туза). Каждому раздается по 6 карт. Одна карта открывается - её масть становится козырной.</p>
              </div>
              
              <div>
                <h3 className="font-semibold text-foreground mb-2">Как бить карты</h3>
                <ul className="list-disc list-inside space-y-1">
                  <li>Картой той же масти, но старшей по рангу</li>
                  <li>Любым козырем (если атакующая карта не козырная)</li>
                  <li>Козырь бьется только старшим козырем</li>
                </ul>
              </div>
              
              <div>
                <h3 className="font-semibold text-foreground mb-2">Подкидывание</h3>
                <p>Можно подкидывать карты того же достоинства, что уже лежат на столе (и атакующие, и отбивающие). Нельзя подкинуть больше карт, чем у защищающегося на руках.</p>
              </div>
              
              <div>
                <h3 className="font-semibold text-foreground mb-2">Старшинство карт</h3>
                <p>6 {"<"} 7 {"<"} 8 {"<"} 9 {"<"} 10 {"<"} В (валет) {"<"} Д (дама) {"<"} К (король) {"<"} Т (туз)</p>
              </div>
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </div>
  );
}

