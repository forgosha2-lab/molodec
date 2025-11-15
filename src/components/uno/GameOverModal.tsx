import { motion } from "framer-motion";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Trophy } from "lucide-react";
import { Player } from "@/shared/uno-schema";

interface GameOverModalProps {
  isOpen: boolean;
  winner: Player | null;
  onPlayAgain?: () => void;
  onBackToLobby: () => void;
}

export function GameOverModal({ isOpen, winner, onPlayAgain, onBackToLobby }: GameOverModalProps) {
  return (
    <Dialog open={isOpen}>
      <DialogContent className="sm:max-w-lg bg-card border-border">
        <div className="p-8 text-center">
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", duration: 0.6 }}
            className="flex justify-center mb-6"
          >
            <Trophy className="w-24 h-24 text-yellow-500" />
          </motion.div>
          
          <motion.h2 
            className="text-4xl font-black mb-4 text-foreground"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            Победа!
          </motion.h2>
          
          <motion.p 
            className="text-2xl font-semibold mb-8 text-muted-foreground"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            {winner?.name} выиграл!
          </motion.p>

          <div className="flex flex-col gap-3">
            {onPlayAgain && (
              <Button
                onClick={onPlayAgain}
                size="lg"
                className="w-full text-lg font-bold uppercase tracking-wide"
              >
                Играть снова
              </Button>
            )}
            <Button
              onClick={onBackToLobby}
              variant="outline"
              size="lg"
              className="w-full text-lg font-semibold"
            >
              Вернуться в лобби
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

