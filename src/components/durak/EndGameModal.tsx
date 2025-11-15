import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { Trophy, Frown, Crown } from 'lucide-react';

interface EndGameModalProps {
  isOpen: boolean;
  winner: string | null;
  loser: string | null;
  onNewGame: () => void;
}

export function EndGameModal({ isOpen, winner, loser, onNewGame }: EndGameModalProps) {
  const isPlayerLoser = loser === 'Вы';
  const isPlayerWinner = winner === 'Вы';

  return (
    <Dialog open={isOpen}>
      <DialogContent className="sm:max-w-md" data-testid="end-game-modal">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl">
            {isPlayerWinner && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", duration: 0.5 }}
                className="flex items-center justify-center gap-2"
              >
                <Trophy className="w-8 h-8 text-primary" />
                <span>Поздравляем!</span>
                <Trophy className="w-8 h-8 text-primary" />
              </motion.div>
            )}
            {isPlayerLoser && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", duration: 0.5 }}
              >
                Игра окончена
              </motion.div>
            )}
            {!isPlayerLoser && !isPlayerWinner && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", duration: 0.5 }}
              >
                Игра окончена
              </motion.div>
            )}
          </DialogTitle>
          <DialogDescription className="text-center space-y-4">
            {isPlayerLoser && (
              <div className="text-lg font-semibold text-destructive flex items-center justify-center gap-2" data-testid="text-loser">
                <Frown className="w-6 h-6" />
                <span>Вы - дурак!</span>
              </div>
            )}
            {isPlayerWinner && (
              <div className="text-lg font-semibold text-primary flex items-center justify-center gap-2" data-testid="text-winner">
                <Crown className="w-6 h-6" />
                <span>Вы победили!</span>
              </div>
            )}
            {!isPlayerLoser && !isPlayerWinner && loser && (
              <div className="text-lg" data-testid="text-result">
                <span className="font-semibold">{loser}</span> - дурак!
              </div>
            )}
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-center mt-4">
          <Button onClick={onNewGame} size="lg" data-testid="button-new-game-modal">
            Новая игра
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

