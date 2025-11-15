import { useState } from "react";
import { GameRoom, Card as UnoCardType } from "@/shared/uno-schema";
import { UnoCard } from "@/components/uno/UnoCard";
import { PlayerHand } from "@/components/uno/PlayerHand";
import { OpponentArea } from "@/components/uno/OpponentArea";
import { ColorPicker } from "@/components/uno/ColorPicker";
import { GameOverModal } from "@/components/uno/GameOverModal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { RotateCcw } from "lucide-react";

interface GameBoardProps {
  room: GameRoom;
  currentPlayerId: string;
  onPlayCard: (cardId: string, selectedColor?: 'red' | 'yellow' | 'green' | 'blue') => void;
  onDrawCard: () => void;
  onCallUno: () => void;
  onBackToLobby: () => void;
}

export default function UnoGameBoard({ 
  room, 
  currentPlayerId, 
  onPlayCard, 
  onDrawCard, 
  onCallUno,
  onBackToLobby 
}: GameBoardProps) {
  const [selectedCard, setSelectedCard] = useState<UnoCardType | null>(null);
  const [showColorPicker, setShowColorPicker] = useState(false);

  const currentPlayer = room.players.find(p => p.id === currentPlayerId);
  const isMyTurn = room.players[room.currentPlayerIndex]?.id === currentPlayerId;
  const topCard = room.discardPile[room.discardPile.length - 1];
  const currentTurnPlayer = room.players[room.currentPlayerIndex];

  const opponents = room.players.filter(p => p.id !== currentPlayerId);
  const opponentPositions: ('top' | 'left' | 'right')[] = 
    opponents.length === 1 ? ['top'] :
    opponents.length === 2 ? ['left', 'right'] :
    ['top', 'left', 'right'];

  const handleCardClick = (card: UnoCardType) => {
    if (!isMyTurn) return;

    setSelectedCard(card);

    if (card.type === 'wild' || card.type === 'wild_draw4') {
      setShowColorPicker(true);
    } else {
      onPlayCard(card.id);
      setSelectedCard(null);
    }
  };

  const handleColorSelect = (color: 'red' | 'yellow' | 'green' | 'blue') => {
    if (selectedCard) {
      onPlayCard(selectedCard.id, color);
      setSelectedCard(null);
    }
    setShowColorPicker(false);
  };

  const shouldShowUnoButton = currentPlayer && currentPlayer.cards.length === 2 && !currentPlayer.hasCalledUno;

  return (
    <div className="h-screen w-screen overflow-hidden bg-gradient-to-br from-green-900 via-green-800 to-green-900 relative">
      <div className="absolute top-0 left-0 right-0 z-20 p-4 flex items-center justify-between bg-black/20 backdrop-blur-sm border-b border-white/10">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-sm font-mono">
            {room.code}
          </Badge>
          {room.direction === 'counterclockwise' && (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            >
              <RotateCcw className="w-5 h-5 text-yellow-400" />
            </motion.div>
          )}
        </div>
        <Badge variant="default" className="text-sm">
          Ход: {currentTurnPlayer?.name}
        </Badge>
        <Button
          onClick={onBackToLobby}
          variant="outline"
          size="sm"
          className="bg-white/10 backdrop-blur-sm"
        >
          Выйти
        </Button>
      </div>

      {opponents.map((opponent, index) => (
        <OpponentArea
          key={opponent.id}
          player={opponent}
          isCurrentTurn={room.players[room.currentPlayerIndex]?.id === opponent.id}
          position={opponentPositions[index]}
        />
      ))}

      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-8 md:gap-16">
        <motion.div
          whileHover={isMyTurn ? { scale: 1.05 } : {}}
          whileTap={isMyTurn ? { scale: 0.95 } : {}}
        >
          <UnoCard
            card={{ id: 'draw-pile', color: 'wild', type: 'wild', value: null }}
            isFaceDown
            onClick={isMyTurn ? onDrawCard : undefined}
            size="large"
          />
          <p className="text-center mt-2 text-white font-bold text-sm">
            {room.drawPile.length}
          </p>
        </motion.div>

        <div className="relative">
          {topCard && (
            <UnoCard
              card={topCard}
              size="large"
            />
          )}
          {room.selectedColor && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -top-3 -right-3"
            >
              <Badge 
                className={`
                  font-bold text-xs px-3 py-1
                  ${room.selectedColor === 'red' ? 'bg-red-500' : ''}
                  ${room.selectedColor === 'yellow' ? 'bg-yellow-400 text-black' : ''}
                  ${room.selectedColor === 'green' ? 'bg-green-500' : ''}
                  ${room.selectedColor === 'blue' ? 'bg-blue-500' : ''}
                `}
              >
                Цвет
              </Badge>
            </motion.div>
          )}
        </div>
      </div>

      {currentPlayer && (
        <PlayerHand
          cards={currentPlayer.cards}
          onCardClick={handleCardClick}
          currentColor={room.selectedColor}
          topCard={topCard}
          selectedCardId={selectedCard?.id || null}
        />
      )}

      <div className="absolute bottom-0 left-0 right-0 pb-32 md:pb-36 px-4 flex justify-center gap-4 z-10">
        {shouldShowUnoButton && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
          >
            <Button
              onClick={onCallUno}
              variant="destructive"
              size="lg"
              className="font-black text-xl uppercase px-8 h-14 shadow-2xl"
            >
              UNO!
            </Button>
          </motion.div>
        )}
        
        {!isMyTurn && (
          <Badge variant="secondary" className="h-14 px-6 flex items-center text-base font-semibold">
            Ожидание хода...
          </Badge>
        )}
      </div>

      <ColorPicker
        isOpen={showColorPicker}
        onColorSelect={handleColorSelect}
      />

      <GameOverModal
        isOpen={room.gameState === 'finished'}
        winner={room.players.find(p => p.id === room.winner) || null}
        onBackToLobby={onBackToLobby}
      />
    </div>
  );
}

