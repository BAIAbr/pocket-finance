import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useAdminCheck } from '@/hooks/useAdminCheck';
import { usePlanAccess } from '@/hooks/usePlanAccess';
import { useSimulatedPlan } from '@/hooks/useSimulatedPlan';
import { useIsMobile } from '@/hooks/use-mobile';
import { FlaskConical, X, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

const PLANS = [
  { code: 'free', label: 'Grátis' },
  { code: 'pro', label: 'Pro' },
  { code: 'premium', label: 'Premium' },
];

export function PlanSimulator() {
  const { user } = useAuth();
  const { isAdmin } = useAdminCheck(user?.id);
  const { realPlanCode, planCode, isSimulating } = usePlanAccess();
  const { setSimulatedPlan } = useSimulatedPlan();
  const [open, setOpen] = useState(false);
  const isMobile = useIsMobile();

  if (!isAdmin || isMobile) return null;

  return (
    <div className="fixed bottom-24 lg:bottom-4 left-4 z-[60] pointer-events-none">
      <div className="pointer-events-auto">
        {!open ? (
          <button
            onClick={() => setOpen(true)}
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-full shadow-lg backdrop-blur border transition-all',
              isSimulating
                ? 'bg-primary text-primary-foreground border-primary animate-pulse'
                : 'bg-card/90 text-foreground border-border hover:bg-card'
            )}
            title="Simulador de plano (admin)"
          >
            <FlaskConical size={14} />
            <span className="text-xs font-semibold uppercase tracking-wide">
              {isSimulating ? `SIM: ${planCode}` : 'Plano'}
            </span>
            <ChevronUp size={12} />
          </button>
        ) : (
          <div className="w-64 rounded-2xl border border-border bg-card/95 backdrop-blur shadow-xl p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <FlaskConical size={14} className="text-primary" />
                <span className="text-xs font-bold uppercase tracking-wide">
                  Simular plano
                </span>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="p-1 rounded-md hover:bg-secondary"
              >
                <X size={14} />
              </button>
            </div>

            <p className="text-[11px] text-muted-foreground mb-2">
              Real: <span className="font-semibold text-foreground">{realPlanCode}</span>
              {isSimulating && (
                <> · Simulando: <span className="font-semibold text-primary">{planCode}</span></>
              )}
            </p>

            <div className="grid grid-cols-3 gap-1.5 mb-2">
              {PLANS.map((p) => {
                const active = planCode === p.code;
                return (
                  <button
                    key={p.code}
                    onClick={() => setSimulatedPlan(p.code)}
                    className={cn(
                      'py-1.5 rounded-lg text-xs font-semibold transition-all',
                      active
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-secondary text-foreground hover:bg-secondary/80'
                    )}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => setSimulatedPlan(null)}
              disabled={!isSimulating}
              className={cn(
                'w-full py-1.5 rounded-lg text-[11px] font-medium transition-all',
                isSimulating
                  ? 'bg-destructive/10 text-destructive hover:bg-destructive/20'
                  : 'bg-secondary/50 text-muted-foreground cursor-not-allowed'
              )}
            >
              Parar simulação
            </button>

            <p className="text-[10px] text-muted-foreground mt-2 leading-tight">
              Ferramenta local (só admin). Não altera assinatura real.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
