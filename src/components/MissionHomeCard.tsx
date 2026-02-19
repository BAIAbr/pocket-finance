import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getIconByName } from '@/lib/icons';
import { CompletedMission } from '@/hooks/useMissions';
import { Trophy } from 'lucide-react';
import { motion } from 'framer-motion';

interface Props {
  completions: CompletedMission[];
  onViewDetails: (completion: CompletedMission) => void;
  onDismiss: (id: string) => void;
}

const MEDAL_COLORS: Record<string, string> = {
  bronze: 'from-amber-600 to-amber-400',
  silver: 'from-slate-400 to-slate-200',
  gold: 'from-yellow-500 to-yellow-300',
};

export function MissionHomeCard({ completions, onViewDetails, onDismiss }: Props) {
  if (completions.length === 0) return null;

  const latest = completions[0];
  const mission = latest.mission;
  if (!mission) return null;

  const Icon = getIconByName(mission.icon);
  const medalColor = MEDAL_COLORS[mission.medal_type] || MEDAL_COLORS.bronze;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
    >
      <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10 overflow-hidden">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            {/* Medal icon */}
            <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${medalColor} flex items-center justify-center shadow-md flex-shrink-0`}>
              <Icon className="w-6 h-6 text-white" />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                <Trophy className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs font-semibold text-primary uppercase tracking-wide">
                  Missão Concluída
                </span>
              </div>
              <p className="font-semibold text-foreground text-sm truncate">{mission.name}</p>
              <p className="text-xs text-muted-foreground">+{latest.xp_earned} XP</p>
            </div>

            {/* Action */}
            <Button
              size="sm"
              variant="outline"
              className="flex-shrink-0 text-xs"
              onClick={() => {
                onViewDetails(latest);
                onDismiss(latest.id);
              }}
            >
              Ver Conquista
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
