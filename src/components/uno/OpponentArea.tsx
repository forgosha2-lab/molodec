import { Player } from "@/shared/uno-schema";
import { UnoCard } from "./UnoCard";
import { motion } from "framer-motion";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

interface OpponentAreaProps {
  player: Player;
  isCurrentTurn: boolean;
  position: 'top' | 'left' | 'right';
}

export function OpponentArea({ player, isCurrentTurn, position }: OpponentAreaProps) {
  const getInitials = (name: string) => {
    return name.slice(0, 2).toUpperCase();
  };

  const positionClasses = {
    top: 'top-4 left-1/2 -translate-x-1/2',
    left: 'top-1/2 left-4 -translate-y-1/2',
    right: 'top-1/2 right-4 -translate-y-1/2',
  };

  const cardFanClasses = {
    top: 'flex-row',
    left: 'flex-col',
    right: 'flex-col',
  };

  return (
    <div 
      className={`absolute ${positionClasses[position]} z-10`}
    >
      <div className="flex flex-col items-center gap-2">
        <div className="flex items-center gap-2 bg-card/90 backdrop-blur-sm rounded-2xl px-4 py-2 border-2 border-border">
          <Avatar className={`w-10 h-10 ${isCurrentTurn ? 'ring-4 ring-primary animate-pulse' : ''}`}>
            <AvatarFallback className="bg-primary text-primary-foreground font-bold">
              {getInitials(player.name)}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="font-bold text-sm text-foreground">
              {player.name}
            </span>
            <Badge variant="secondary" className="w-fit text-xs">
              {player.cards.length} {player.cards.length === 1 ? 'карта' : 'карты'}
            </Badge>
          </div>
          {player.hasCalledUno && player.cards.length === 1 && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -top-2 -right-2"
            >
              <Badge variant="destructive" className="font-black text-xs">UNO!</Badge>
            </motion.div>
          )}
        </div>

        <div className={`flex ${cardFanClasses[position]} items-center -space-x-8`}>
          {player.cards.slice(0, Math.min(5, player.cards.length)).map((_, index) => (
            <motion.div
              key={index}
              initial={{ scale: 0, rotate: 0 }}
              animate={{ scale: 1, rotate: index * 2 - 4 }}
              transition={{ delay: index * 0.05 }}
            >
              <UnoCard
                card={{ id: `back-${index}`, color: 'wild', type: 'wild', value: null }}
                isFaceDown
                size="small"
              />
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

