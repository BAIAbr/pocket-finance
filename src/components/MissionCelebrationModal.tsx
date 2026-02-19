import { useEffect, useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { getIconByName } from '@/lib/icons';
import { useConfetti } from '@/hooks/useConfetti';
import { CompletedMission, RARITY_CONFIG } from '@/hooks/useMissions';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  completion: CompletedMission | null;
  onDismiss: () => void;
  onViewDetails: (completion: CompletedMission) => void;
}

export function MissionCelebrationModal({ completion, onDismiss, onViewDetails }: Props) {
  const { fireGoalComplete } = useConfetti();
  const [hasFireworks, setHasFireworks] = useState(false);

  useEffect(() => {
    if (completion && !hasFireworks) {
      setTimeout(() => { fireGoalComplete(); setHasFireworks(true); }, 300);
    }
    if (!completion) setHasFireworks(false);
  }, [completion]);

  useEffect(() => {
    if (!completion) return;
    const timer = setTimeout(onDismiss, 5000);
    return () => clearTimeout(timer);
  }, [completion, onDismiss]);

  if (!completion?.mission) return null;

  const { mission } = completion;
  const Icon = getIconByName(mission.icon);
  const rarity = RARITY_CONFIG[mission.rarity] || RARITY_CONFIG.common;

  return (
    <Dialog open={!!completion} onOpenChange={() => onDismiss()}>
      <DialogContent className={`sm:max-w-sm ${rarity.border} bg-card overflow-hidden p-0`}>
        <AnimatePresence>
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: 'spring', damping: 15 }}
            className="flex flex-col items-center text-center p-6 pt-8"
          >
            {/* Rarity badge */}
            <motion.div
              initial={{ y: -10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-3 ${rarity.bg} ${rarity.border} border`}
            >
              {rarity.emoji} {rarity.label}
            </motion.div>

            {/* Trophy/Medal */}
            <motion.div
              initial={{ rotateY: 180, scale: 0 }}
              animate={{ rotateY: 0, scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', damping: 12 }}
              className={`w-20 h-20 rounded-full bg-gradient-to-br ${rarity.color} flex items-center justify-center shadow-lg ${rarity.glow} mb-4`}
            >
              <Icon className="w-10 h-10 text-white drop-shadow-md" />
            </motion.div>

            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">
                {mission.rarity === 'legendary' ? '🏆 Troféu Lendário!' : mission.rarity === 'epic' ? '✨ Conquista Épica!' : '🎉 Missão Concluída!'}
              </p>
              <h3 className="text-xl font-bold text-foreground mb-1">{mission.name}</h3>
              <p className="text-sm text-muted-foreground mb-3">{mission.description}</p>
            </motion.div>

            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.6, type: 'spring' }}
              className="bg-primary/10 border border-primary/20 rounded-full px-4 py-1.5 mb-5"
            >
              <span className="text-sm font-bold text-primary">+{completion.xp_earned} XP</span>
            </motion.div>

            <div className="flex gap-2 w-full">
              <Button variant="outline" className="flex-1" onClick={onDismiss}>Fechar</Button>
              <Button className="flex-1" onClick={() => onViewDetails(completion)}>Ver Detalhes</Button>
            </div>
          </motion.div>
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
