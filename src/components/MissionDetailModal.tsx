import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { getIconByName } from '@/lib/icons';
import { CompletedMission, UserXP } from '@/hooks/useMissions';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Props {
  completion: CompletedMission | null;
  userXP: UserXP;
  totalMissions: number;
  completedCount: number;
  onClose: () => void;
}

const MEDAL_LABELS: Record<string, string> = {
  bronze: '🥉 Bronze',
  silver: '🥈 Prata',
  gold: '🥇 Ouro',
};

const MEDAL_COLORS: Record<string, string> = {
  bronze: 'from-amber-600 to-amber-400',
  silver: 'from-slate-400 to-slate-200',
  gold: 'from-yellow-500 to-yellow-300',
};

const XP_PER_LEVEL = 200;

export function MissionDetailModal({ completion, userXP, totalMissions, completedCount, onClose }: Props) {
  if (!completion?.mission) return null;

  const { mission } = completion;
  const Icon = getIconByName(mission.icon);
  const medalColor = MEDAL_COLORS[mission.medal_type] || MEDAL_COLORS.bronze;
  const progressPercent = totalMissions > 0 ? (completedCount / totalMissions) * 100 : 0;
  const xpInLevel = userXP.total_xp % XP_PER_LEVEL;
  const levelProgress = (xpInLevel / XP_PER_LEVEL) * 100;

  return (
    <Dialog open={!!completion} onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">Detalhes da Conquista</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center text-center space-y-4">
          {/* Large medal */}
          <div className={`w-24 h-24 rounded-full bg-gradient-to-br ${medalColor} flex items-center justify-center shadow-xl`}>
            <Icon className="w-12 h-12 text-white drop-shadow-md" />
          </div>

          <div>
            <span className="text-xs font-semibold text-muted-foreground uppercase">
              {MEDAL_LABELS[mission.medal_type] || 'Medalha'}
            </span>
            <h3 className="text-xl font-bold text-foreground">{mission.name}</h3>
            <p className="text-sm text-muted-foreground mt-1">{mission.description}</p>
          </div>

          {/* Info grid */}
          <div className="grid grid-cols-2 gap-3 w-full">
            <div className="bg-secondary rounded-lg p-3">
              <p className="text-xs text-muted-foreground">XP Ganho</p>
              <p className="text-lg font-bold text-primary">+{completion.xp_earned}</p>
            </div>
            <div className="bg-secondary rounded-lg p-3">
              <p className="text-xs text-muted-foreground">Concluída em</p>
              <p className="text-sm font-semibold text-foreground">
                {format(new Date(completion.completed_at), "dd MMM yyyy", { locale: ptBR })}
              </p>
            </div>
          </div>

          {/* User progress */}
          <div className="w-full space-y-3 bg-secondary/50 rounded-lg p-4">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Nível {userXP.level}</span>
              <span className="font-semibold text-foreground">{userXP.total_xp} XP total</span>
            </div>
            <Progress value={levelProgress} className="h-2" />
            <p className="text-xs text-muted-foreground">
              {XP_PER_LEVEL - xpInLevel} XP para o próximo nível
            </p>

            <div className="flex justify-between text-sm pt-2 border-t border-border">
              <span className="text-muted-foreground">Missões completas</span>
              <span className="font-semibold">{completedCount}/{totalMissions}</span>
            </div>
            <Progress value={progressPercent} className="h-2" />
          </div>

          <Button onClick={onClose} className="w-full">Fechar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
