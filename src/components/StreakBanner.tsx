import { Flame, Check, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';

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
          <div
            className={cn(
              'relative flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-500',
              hasRegisteredToday
                ? 'bg-orange-500/20 shadow-[0_0_16px_4px_hsl(25_95%_53%/0.35)]'
                : 'bg-orange-500/10'
            )}
          >
            <Flame
              className={cn(
                'w-5 h-5 transition-all duration-500',
                hasRegisteredToday
                  ? 'text-orange-400 fill-orange-500 drop-shadow-[0_0_6px_hsl(25_95%_53%/0.6)]'
                  : 'text-orange-500'
              )}
            />
            {hasRegisteredToday && (
              <span className="absolute inset-0 rounded-xl animate-ping bg-orange-500/20 pointer-events-none" style={{ animationDuration: '1.5s', animationIterationCount: '3' }} />
            )}
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Sequência atual</p>
            <p className="text-xl font-bold">{currentStreak} {currentStreak === 1 ? 'dia' : 'dias'}</p>
          </div>
        </div>

        {hasRegisteredToday ? (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 animate-scale-in">
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
