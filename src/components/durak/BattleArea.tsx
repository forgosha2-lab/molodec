import { BattlePair } from '@/shared/schema';
import { Card } from './Card';
import { motion } from 'framer-motion';

interface BattleAreaProps {
  battlePairs: BattlePair[];
}

export function BattleArea({ battlePairs }: BattleAreaProps) {
  return (
    <div className="flex-1 flex items-center justify-center" data-testid="battle-area">
      {battlePairs.length === 0 ? (
        <div className="text-muted-foreground text-lg">Зона битвы</div>
      ) : (
        <div className="flex flex-wrap gap-4 justify-center max-w-4xl">
          {battlePairs.map((pair, index) => (
            <motion.div
              key={pair.attackCard.id}
              className="relative"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              data-testid={`battle-pair-${index}`}
            >
              <div className="flex gap-2">
                <Card card={pair.attackCard} disabled data-testid={`attack-card-${index}`} />
                {pair.defendCard ? (
                  <div className="relative -ml-12">
                    <Card card={pair.defendCard} disabled data-testid={`defend-card-${index}`} />
                  </div>
                ) : (
                  <div className="w-[100px] h-[140px] rounded-lg border-2 border-dashed border-primary/50 flex items-center justify-center">
                    <span className="text-primary/70 text-sm">?</span>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

