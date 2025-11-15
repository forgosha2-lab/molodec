import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { GameState, Card as CardType } from "@/shared/schema";
import { Deck } from "@/components/durak/Deck";
import { TrumpCard } from "@/components/durak/TrumpCard";
import { BattleArea } from "@/components/durak/BattleArea";
import { PlayerHand } from "@/components/durak/PlayerHand";
import { OpponentArea } from "@/components/durak/OpponentArea";
import { GameControls } from "@/components/durak/GameControls";
import { GameStatus } from "@/components/durak/GameStatus";
import { EndGameModal } from "@/components/durak/EndGameModal";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/apiClient";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

const DurakGame = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedCards, setSelectedCards] = useState<string[]>([]);
  const [currentMessage, setCurrentMessage] = useState('');

  // Fetch game state
  const { data: gameData, isLoading } = useQuery<{ gameState: GameState }>({
    queryKey: ['/api/game/state'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/game/state');
      return response;
    },
    retry: false,
    refetchInterval: 2000,
  });

  const gameState = gameData?.gameState;

  // Create new game mutation
  const newGameMutation = useMutation({
    mutationFn: async (numberOfPlayers: number = 2) => {
      const response = await apiRequest('POST', '/api/game/new', { numberOfPlayers });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/game/state'] });
      setSelectedCards([]);
      setCurrentMessage('Игра началась!');
    },
    onError: (error: any) => {
      toast({
        title: 'Ошибка',
        description: error.message || 'Не удалось создать игру',
        variant: 'destructive',
      });
    },
  });

  // Play card mutation
  const playCardMutation = useMutation({
    mutationFn: async ({ cardIds, attackCardId }: { cardIds: string[]; attackCardId?: string }) => {
      return await apiRequest('POST', '/api/game/play', { cardIds, attackCardId });
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/game/state'] });
      setSelectedCards([]);
      if (data.message) {
        setCurrentMessage(data.message);
      }
    },
    onError: (error: any) => {
      toast({
        title: 'Недопустимый ход',
        description: error.message || 'Не удалось сыграть карту',
        variant: 'destructive',
      });
    },
  });

  // Take cards mutation
  const takeCardsMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('POST', '/api/game/take', {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/game/state'] });
      setSelectedCards([]);
      setCurrentMessage('Карты взяты');
    },
    onError: (error: any) => {
      toast({
        title: 'Ошибка',
        description: error.message || 'Не удалось взять карты',
        variant: 'destructive',
      });
    },
  });

  // Pass mutation
  const passMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('POST', '/api/game/pass', {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/game/state'] });
      setSelectedCards([]);
      setCurrentMessage('Пас');
    },
    onError: (error: any) => {
      toast({
        title: 'Ошибка',
        description: error.message || 'Не удалось пасовать',
        variant: 'destructive',
      });
    },
  });

  const startNewGame = useCallback((numberOfPlayers: number) => {
    newGameMutation.mutate(numberOfPlayers);
  }, [newGameMutation]);

  const handleCardClick = (cardId: string) => {
    if (playCardMutation.isPending || takeCardsMutation.isPending || passMutation.isPending) {
      return;
    }

    if (selectedCards.includes(cardId)) {
      setSelectedCards(selectedCards.filter(id => id !== cardId));
    } else {
      if (gameState?.phase === 'defending') {
        setSelectedCards([cardId]);
      } else {
        setSelectedCards([...selectedCards, cardId]);
      }
    }
  };

  const handlePlayCard = () => {
    if (!gameState || selectedCards.length === 0) {
      toast({
        title: 'Выберите карту',
        description: 'Нужно выбрать хотя бы одну карту для хода',
        variant: 'destructive',
      });
      return;
    }

    if (gameState.phase === 'defending') {
      const undefendedPair = gameState.battlePairs.find(p => !p.defendCard);
      if (undefendedPair) {
        playCardMutation.mutate({
          cardIds: selectedCards,
          attackCardId: undefendedPair.attackCard.id,
        });
      }
    } else {
      playCardMutation.mutate({ cardIds: selectedCards });
    }
  };

  const handleTake = () => {
    if (!gameState) return;
    takeCardsMutation.mutate();
  };

  const handlePass = () => {
    if (!gameState) return;
    passMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-game-table flex items-center justify-center">
        <div className="text-white text-2xl">Загрузка...</div>
      </div>
    );
  }

  if (!gameState) {
    return (
      <div className="min-h-screen bg-game-table flex items-center justify-center">
        <div className="flex flex-col items-center gap-6 p-8 bg-card rounded-lg shadow-2xl">
          <h1 className="text-4xl font-bold">Дурак Подкидной</h1>
          <p className="text-lg text-muted-foreground">Выберите количество игроков</p>
          <div className="flex gap-4">
            <Button size="lg" onClick={() => startNewGame(2)}>2 игрока</Button>
            <Button size="lg" onClick={() => startNewGame(3)}>3 игрока</Button>
            <Button size="lg" onClick={() => startNewGame(4)}>4 игрока</Button>
          </div>
          <Button variant="outline" onClick={() => navigate("/lobbies")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Назад к лобби
          </Button>
        </div>
      </div>
    );
  }

  const player = gameState.players.find(p => !p.isAI);
  const opponents = gameState.players.filter(p => p.isAI);
  const isPlayerDefender = gameState.currentDefenderIndex === gameState.players.findIndex(p => !p.isAI);
  const isPlayerAttacker = gameState.currentAttackerIndex === gameState.players.findIndex(p => !p.isAI);

  const canPlayCard = (isPlayerAttacker && gameState.phase === 'attacking') ||
                      (isPlayerDefender && gameState.phase === 'defending');
  const canTake = isPlayerDefender && gameState.phase === 'defending' && gameState.battlePairs.length > 0;
  const canPass = isPlayerAttacker && gameState.phase === 'attacking' && gameState.canThrow;

  const isGameEnded = gameState.phase === 'ended';

  return (
    <div className="min-h-screen bg-game-table relative overflow-hidden">
      <div className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `repeating-linear-gradient(
            45deg,
            transparent,
            transparent 10px,
            rgba(0,0,0,.03) 10px,
            rgba(0,0,0,.03) 20px
          )`
        }}
      />

      <div className="relative z-10 container mx-auto px-4 py-6 h-screen flex flex-col">
        <div className="mb-4">
          <Button variant="ghost" onClick={() => navigate("/lobbies")} className="mb-2">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Назад к лобби
          </Button>
          <h1 className="text-3xl font-bold text-white text-center mb-2">
            Дурак Подкидной
          </h1>
          <GameStatus
            phase={gameState.phase}
            trumpSuit={gameState.trumpSuit}
            currentMessage={currentMessage}
          />
        </div>

        <div className="mb-4">
          <div className="flex gap-4 justify-center flex-wrap">
            {opponents.map((opponent, index) => (
              <OpponentArea
                key={opponent.id}
                player={opponent}
                isActive={gameState.currentAttackerIndex === gameState.players.findIndex(p => p.id === opponent.id)}
                isDefender={gameState.currentDefenderIndex === gameState.players.findIndex(p => p.id === opponent.id)}
              />
            ))}
          </div>
        </div>

        <div className="flex-1 flex items-center gap-8 justify-center mb-4">
          <Deck cardsRemaining={gameState.deck.length} />
          <TrumpCard card={gameState.trumpCard} />
          <BattleArea battlePairs={gameState.battlePairs} />
        </div>

        <div className="mb-4">
          <PlayerHand
            cards={player?.hand || []}
            selectedCards={selectedCards}
            onCardClick={handleCardClick}
            canPlay={canPlayCard && !playCardMutation.isPending}
          />
        </div>

        <div className="pb-4">
          <GameControls
            onPlayCard={handlePlayCard}
            onTake={handleTake}
            onPass={handlePass}
            onNewGame={startNewGame}
            canPlayCard={canPlayCard && selectedCards.length > 0 && !playCardMutation.isPending}
            canTake={canTake && !takeCardsMutation.isPending}
            canPass={canPass && !passMutation.isPending}
            phase={gameState.phase}
          />
        </div>
      </div>

      <EndGameModal
        isOpen={isGameEnded}
        winner={gameState.winner}
        loser={gameState.loser}
        onNewGame={() => startNewGame(2)}
      />
    </div>
  );
};

export default DurakGame;
