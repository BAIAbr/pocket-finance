import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { getIconByName } from '@/lib/icons';
import { WeeklyMission, RARITY_CONFIG } from '@/hooks/useMissions';
import { Sparkles, RefreshCw, Clock, Trophy } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

interface Props {
  missions: WeeklyMission[];
  isLoading: boolean;
  onGenerate: () => void;
}

export function WeeklyMissionsCard({ missions, isLoading, onGenerate }: Props) {
  const navigate = useNavigate();
  const completedCount = missions.filter(m => m.is_completed).length;
  const allCompleted = completedCount === missions.length && missions.length > 0;

  if (missions.length === 0) {
    return (
      <Card className="border-dashed border-2 border-primary/20">
        <CardContent className="p-6 flex flex-col items-center text-center gap-3">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Missões Semanais</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Gere missões personalizadas baseadas no seu perfil financeiro
            </p>
          </div>
          <Button onClick={onGenerate} disabled={isLoading} className="gap-2">
            {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {isLoading ? 'Gerando...' : 'Gerar Missões da Semana'}
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Calculate time remaining
  const expiresAt = new Date(missions[0]?.expires_at);
  const now = new Date();
  const daysLeft = Math.max(0, Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            Missões Semanais
          </CardTitle>
          {allCompleted ? (
            <div className="flex items-center gap-1.5 text-xs text-primary font-medium">
              <Trophy className="w-3 h-3" />
              Todas completas!
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="w-3 h-3" />
              {daysLeft}d restantes
            </div>
          )}
        </div>
        <p className="text-xs text-muted-foreground">{completedCount}/{missions.length} completas</p>
      </CardHeader>
      <CardContent className="pb-4">
        <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 snap-x snap-mandatory scrollbar-hide">
          {missions.map((mission, i) => {
            const Icon = getIconByName(mission.icon);
            const rarity = RARITY_CONFIG[mission.rarity] || RARITY_CONFIG.common;
            const progress = mission.target_value > 0 ? (mission.current_value / mission.target_value) * 100 : 0;

            return (
              <motion.div
                key={mission.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className={`flex-shrink-0 w-[75vw] max-w-[280px] snap-start p-3 rounded-xl ${mission.is_completed ? 'bg-primary/5 opacity-60' : 'bg-secondary/50'}`}
              >
                <div className="flex items-center gap-2.5 mb-2">
                  <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${rarity.color} flex items-center justify-center flex-shrink-0 ${mission.is_completed ? 'opacity-50' : ''}`}>
                    <Icon className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className={`text-sm font-semibold truncate ${mission.is_completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                        {mission.title}
                      </p>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold flex-shrink-0 ${rarity.bg} ${rarity.border} border`}>
                        <span className={rarity.emojiColor}>{rarity.emoji}</span>
                      </span>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mb-2 leading-relaxed">
                  {mission.description}
                </p>
                <div className="flex items-center gap-2">
                  <Progress value={Math.min(progress, 100)} className="h-1.5 flex-1" />
                  <span className="text-[10px] text-muted-foreground font-medium">
                    {mission.current_value}/{mission.target_value}
                  </span>
                  <span className="text-[10px] font-bold text-primary">+{mission.xp_reward} XP</span>
                </div>
              </motion.div>
            );
          })}
        </div>

        <Button
          variant="outline"
          size="sm"
          className="w-full gap-2 mt-2"
          onClick={() => navigate('/achievements')}
        >
          <Trophy className="w-4 h-4" />
          Ver Conquistas
        </Button>
      </CardContent>
    </Card>
  );
}
