import { useEffect, useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { getIconByName } from '@/lib/icons';
import { useConfetti } from '@/hooks/useConfetti';
import { CompletedMission } from '@/hooks/useMissions';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  completion: CompletedMission | null;
  onDismiss: () => void;
  onViewDetails: (completion: CompletedMission) => void;
}

const MEDAL_COLORS: Record<string, string> = {
  bronze: 'from-amber-600 to-amber-400',
  silver: 'from-slate-400 to-slate-200',
  gold: 'from-yellow-500 to-yellow-300',
};

const MEDAL_GLOW: Record<string, string> = {
  bronze: 'shadow-amber-400/50',
  silver: 'shadow-slate-300/50',
  gold: 'shadow-yellow-400/50',
};

export function MissionCelebrationModal({ completion, onDismiss, onViewDetails }: Props) {
  const { fireGoalComplete } = useConfetti();
  const [hasFireworks, setHasFireworks] = useState(false);

  useEffect(() => {
    if (completion && !hasFireworks) {
      setTimeout(() => {
        fireGoalComplete();
        setHasFireworks(true);
      }, 300);
    }
    if (!completion) setHasFireworks(false);
  }, [completion]);

  // Auto-dismiss after 5 seconds
  useEffect(() => {
    if (!completion) return;
    const timer = setTimeout(onDismiss, 5000);
    return () => clearTimeout(timer);
  }, [completion, onDismiss]);

  if (!completion?.mission) return null;

  const { mission } = completion;
  const Icon = getIconByName(mission.icon);
  const medalColor = MEDAL_COLORS[mission.medal_type] || MEDAL_COLORS.bronze;
  const medalGlow = MEDAL_GLOW[mission.medal_type] || MEDAL_GLOW.bronze;

  return (
    <Dialog open={!!completion} onOpenChange={() => onDismiss()}>
      <DialogContent className="sm:max-w-sm border-primary/20 bg-card overflow-hidden p-0">
        <AnimatePresence>
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: 'spring', damping: 15 }}
            className="flex flex-col items-center text-center p-6 pt-8"
          >
            {/* Medal */}
            <motion.div
              initial={{ rotateY: 180, scale: 0 }}
              animate={{ rotateY: 0, scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', damping: 12 }}
              className={`w-20 h-20 rounded-full bg-gradient-to-br ${medalColor} flex items-center justify-center shadow-lg ${medalGlow} mb-4`}
            >
              <Icon className="w-10 h-10 text-white drop-shadow-md" />
            </motion.div>

            {/* Title */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">
                🎉 Missão Concluída!
              </p>
              <h3 className="text-xl font-bold text-foreground mb-1">{mission.name}</h3>
              <p className="text-sm text-muted-foreground mb-3">{mission.description}</p>
            </motion.div>

            {/* XP Badge */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.6, type: 'spring' }}
              className="bg-primary/10 border border-primary/20 rounded-full px-4 py-1.5 mb-5"
            >
              <span className="text-sm font-bold text-primary">+{completion.xp_earned} XP</span>
            </motion.div>

            {/* Actions */}
            <div className="flex gap-2 w-full">
              <Button variant="outline" className="flex-1" onClick={onDismiss}>
                Fechar
              </Button>
              <Button className="flex-1" onClick={() => onViewDetails(completion)}>
                Ver Detalhes
              </Button>
            </div>
          </motion.div>
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
