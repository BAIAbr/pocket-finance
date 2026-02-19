import { useMemo } from 'react';
import { Trophy, Lock, CheckCircle2, Sparkles, Star, Flame, Target } from 'lucide-react';
import { getIconByName } from '@/lib/icons';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useMissionContext } from '@/contexts/MissionContext';
import { RARITY_CONFIG, type Mission } from '@/hooks/useMissions';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

const XP_PER_LEVEL = 200;

const RARITY_ORDER = ['legendary', 'epic', 'rare', 'common'] as const;

const RARITY_SECTION_STYLE: Record<string, { icon: React.ElementType; headerGradient: string }> = {
  legendary: { icon: Flame, headerGradient: 'from-yellow-500/20 via-orange-500/10 to-transparent' },
  epic: { icon: Star, headerGradient: 'from-purple-500/20 via-pink-500/10 to-transparent' },
  rare: { icon: Sparkles, headerGradient: 'from-blue-500/20 via-cyan-500/10 to-transparent' },
  common: { icon: Target, headerGradient: 'from-slate-500/20 via-slate-400/10 to-transparent' },
};

function MissionCard({ mission, isCompleted, completedAt }: { mission: Mission; isCompleted: boolean; completedAt?: string }) {
  const rarity = RARITY_CONFIG[mission.rarity] ?? RARITY_CONFIG.common;
  const isLegendary = mission.rarity === 'legendary';
  const IconComponent = getIconByName(mission.icon);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'relative rounded-xl border p-4 transition-all duration-300 overflow-hidden',
        isCompleted
          ? `${rarity.border} ${rarity.bg} shadow-lg ${rarity.glow}`
          : 'border-border/50 bg-card/50 opacity-70',
        isLegendary && isCompleted && 'legendary-trophy'
      )}
    >
      {/* Legendary shimmer overlay */}
      {isLegendary && isCompleted && (
        <div className="absolute inset-0 legendary-shimmer pointer-events-none" />
      )}

      <div className="relative flex items-start gap-3">
        <motion.div
          className={cn(
            'w-12 h-12 rounded-xl flex items-center justify-center shrink-0 overflow-hidden',
            isCompleted
              ? mission.image_url
                ? 'bg-transparent'
                : `bg-gradient-to-br ${rarity.color} shadow-md`
              : 'bg-muted'
          )}
          animate={isLegendary && isCompleted ? {
            scale: [1, 1.08, 1],
            rotate: [0, 3, -3, 0],
          } : {}}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        >
          {isCompleted ? (
            mission.image_url ? (
              <img src={mission.image_url} alt={mission.name} className="w-full h-full object-contain" loading="lazy" />
            ) : (
              <IconComponent size={22} className="text-white drop-shadow-md" />
            )
          ) : (
            <Lock size={20} className="text-muted-foreground" />
          )}
        </motion.div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className={cn(
              'font-semibold text-sm truncate',
              isCompleted ? 'text-foreground' : 'text-muted-foreground'
            )}>
              {mission.name}
            </h3>
            {isCompleted && <CheckCircle2 size={14} className="text-green-500 shrink-0" />}
          </div>

          <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
            {mission.description}
          </p>

          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
              {rarity.emoji} {rarity.label}
            </Badge>
            <span className="text-[10px] text-muted-foreground font-medium">
              +{mission.xp_reward} XP
            </span>
            {isCompleted && completedAt && (
              <span className="text-[10px] text-muted-foreground ml-auto">
                {new Date(completedAt).toLocaleDateString('pt-BR')}
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function Achievements() {
  const { missions, completedMissions, weeklyMissions, userXP } = useMissionContext();

  const completedMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const cm of completedMissions) {
      map.set(cm.mission_id, cm.completed_at);
    }
    return map;
  }, [completedMissions]);

  const groupedByRarity = useMemo(() => {
    const groups: Record<string, Mission[]> = {};
    for (const r of RARITY_ORDER) groups[r] = [];
    for (const m of missions) {
      const r = RARITY_ORDER.includes(m.rarity as any) ? m.rarity : 'common';
      groups[r].push(m);
    }
    return groups;
  }, [missions]);

  const totalCompleted = completedMissions.length;
  const totalMissions = missions.length;
  const progressPercent = totalMissions > 0 ? Math.round((totalCompleted / totalMissions) * 100) : 0;
  const currentLevelXP = userXP.total_xp % XP_PER_LEVEL;
  const xpToNext = XP_PER_LEVEL - currentLevelXP;

  return (
    <div className="min-h-screen bg-background pb-28 lg:pb-8 safe-top">
      <header className="px-4 lg:px-8 pt-6 pb-4 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />
        <div className="relative">
          <p className="text-muted-foreground text-sm font-medium">Gamificação</p>
          <h1 className="text-2xl lg:text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
            Conquistas
          </h1>
        </div>
      </header>

      <main className="px-4 lg:px-8 space-y-5">
        {/* XP & Level Card */}
        <Card className="overflow-hidden">
          <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-5">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg">
                <Trophy size={28} className="text-primary-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Nível</p>
                <p className="text-3xl font-bold text-foreground">{userXP.level}</p>
              </div>
              <div className="ml-auto text-right">
                <p className="text-sm text-muted-foreground">XP Total</p>
                <p className="text-xl font-bold text-primary">{userXP.total_xp}</p>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Progresso para Nível {userXP.level + 1}</span>
                <span>{currentLevelXP}/{XP_PER_LEVEL} XP</span>
              </div>
              <Progress value={(currentLevelXP / XP_PER_LEVEL) * 100} className="h-2.5" />
              <p className="text-[10px] text-muted-foreground">Faltam {xpToNext} XP</p>
            </div>
          </div>
        </Card>

        {/* Overall Progress */}
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-foreground">Progresso Geral</span>
              <span className="text-sm font-bold text-primary">{totalCompleted}/{totalMissions}</span>
            </div>
            <Progress value={progressPercent} className="h-2" />
            <p className="text-xs text-muted-foreground mt-1">{progressPercent}% das missões concluídas</p>
          </CardContent>
        </Card>

        {/* Weekly Missions */}
        {weeklyMissions.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles size={18} className="text-primary" />
                Missões Semanais
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {weeklyMissions.map((wm) => {
                const wmRarity = RARITY_CONFIG[wm.rarity] ?? RARITY_CONFIG.common;
                const progress = wm.target_value > 0 ? Math.min(100, (wm.current_value / wm.target_value) * 100) : 0;
                const WmIcon = getIconByName(wm.icon);
                return (
                  <div key={wm.id} className={cn(
                    'rounded-lg border p-3',
                    wm.is_completed ? `${wmRarity.border} ${wmRarity.bg}` : 'border-border/50'
                  )}>
                    <div className="flex items-center gap-2 mb-1.5">
                      <WmIcon size={18} className="text-primary shrink-0" />
                      <span className="text-sm font-medium flex-1 truncate">{wm.title}</span>
                      {wm.is_completed && <CheckCircle2 size={14} className="text-green-500" />}
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                        {wmRarity.emoji} {wmRarity.label}
                      </Badge>
                    </div>
                    <Progress value={progress} className="h-1.5 mb-1" />
                    <div className="flex justify-between text-[10px] text-muted-foreground">
                      <span>{wm.current_value}/{wm.target_value}</span>
                      <span>+{wm.xp_reward} XP</span>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        {/* Missions by rarity */}
        {RARITY_ORDER.map((rarity) => {
          const group = groupedByRarity[rarity];
          if (!group || group.length === 0) return null;
          const config = RARITY_CONFIG[rarity];
          const sectionStyle = RARITY_SECTION_STYLE[rarity];
          const SectionIcon = sectionStyle.icon;
          const completedInGroup = group.filter(m => completedMap.has(m.id)).length;

          return (
            <div key={rarity} className="space-y-3">
              <div className={cn('rounded-xl p-3 bg-gradient-to-r', sectionStyle.headerGradient)}>
                <div className="flex items-center gap-2">
                  <SectionIcon size={18} className="text-foreground/70" />
                  <h2 className="font-bold text-base">
                    {config.emoji} {config.label}
                  </h2>
                  <span className="text-xs text-muted-foreground ml-auto">
                    {completedInGroup}/{group.length}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {group.map((mission) => (
                  <MissionCard
                    key={mission.id}
                    mission={mission}
                    isCompleted={completedMap.has(mission.id)}
                    completedAt={completedMap.get(mission.id)}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </main>
    </div>
  );
}
