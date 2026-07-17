import { useNavigate } from 'react-router-dom';
import { ChevronRight, Sparkles } from 'lucide-react';
import * as Icons from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useSmartInsights, type InsightTone } from '@/hooks/useSmartInsights';

const toneClasses: Record<InsightTone, { bg: string; text: string; ring: string; icon: string }> = {
  positive: { bg: 'bg-income/10', text: 'text-income', ring: 'ring-income/20', icon: 'text-income' },
  negative: { bg: 'bg-expense/10', text: 'text-expense', ring: 'ring-expense/20', icon: 'text-expense' },
  warning:  { bg: 'bg-orange-500/10', text: 'text-orange-500', ring: 'ring-orange-500/20', icon: 'text-orange-500' },
  neutral:  { bg: 'bg-primary/10', text: 'text-primary', ring: 'ring-primary/20', icon: 'text-primary' },
};

function DynIcon({ name, className }: { name: string; className?: string }) {
  const Lib: any = Icons;
  const Cmp = Lib[name] ?? Lib.Sparkles;
  return <Cmp className={className} size={16} />;
}

export function SmartInsightsSection() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const { greeting, insights } = useSmartInsights(profile?.name);
  const gTone = toneClasses[greeting.tone];

  return (
    <section className="space-y-4 animate-fade-in">
      {/* Smart greeting */}
      <div
        className={cn(
          'relative overflow-hidden rounded-2xl border border-border/60 bg-card p-4 lg:p-5',
          'shadow-sm'
        )}
      >
        <div className={cn('absolute inset-0 opacity-40 pointer-events-none', gTone.bg)} />
        <div className="relative">
          <p className="text-xs text-muted-foreground font-medium">{greeting.timeGreeting}</p>
          <h2 className="text-base lg:text-lg font-semibold mt-0.5 leading-snug">
            {greeting.headline}
          </h2>
          <p className="text-xs lg:text-sm text-muted-foreground mt-1">{greeting.subline}</p>
        </div>
      </div>

      {/* Weekly insights */}
      <div>
        <div className="flex items-center justify-between mb-2 px-1">
          <div className="flex items-center gap-1.5">
            <Sparkles size={14} className="text-primary" />
            <h3 className="text-sm font-semibold">Insights da semana</h3>
          </div>
          <span className="text-[10px] text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
            Automático
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {insights.map((i) => {
            const t = toneClasses[i.tone];
            const clickable = !!i.action;
            return (
              <button
                key={i.id}
                type="button"
                onClick={() => i.action && navigate(i.action.to)}
                disabled={!clickable}
                className={cn(
                  'group text-left rounded-xl p-3 border border-border/60 bg-card',
                  'transition-all',
                  clickable && 'hover:border-primary/40 hover:shadow-sm active:scale-[0.99]'
                )}
              >
                <div className="flex items-start gap-3">
                  <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0', t.bg)}>
                    <DynIcon name={i.icon} className={t.icon} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold leading-tight">{i.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
                      {i.description}
                    </p>
                    {i.action && (
                      <span className={cn('inline-flex items-center gap-0.5 text-[11px] font-medium mt-1.5', t.text)}>
                        {i.action.label}
                        <ChevronRight size={12} />
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
