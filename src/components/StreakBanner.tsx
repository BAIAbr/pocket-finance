import { Flame, Check, Circle } from 'lucide-react';

interface StreakBannerProps {
  currentStreak: number;
  hasRegisteredToday: boolean;
  onRegisterClick: () => void;
}

export function StreakBanner({ currentStreak, hasRegisteredToday, onRegisterClick }: StreakBannerProps) {
  return (
    <div className="rounded-2xl bg-card border border-border/50 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-orange-500/10">
            <Flame className="w-5 h-5 text-orange-500" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Sequência atual</p>
            <p className="text-xl font-bold">{currentStreak} {currentStreak === 1 ? 'dia' : 'dias'}</p>
          </div>
        </div>

        {hasRegisteredToday ? (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <Check className="w-4 h-4" />
            <span className="text-xs font-medium">Registrado</span>
          </div>
        ) : (
          <button
            onClick={onRegisterClick}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Circle className="w-3 h-3" />
            Registrar
          </button>
        )}
      </div>
    </div>
  );
}
