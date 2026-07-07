import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Crown, Loader2 } from 'lucide-react';
import { usePlanAccess } from '@/hooks/usePlanAccess';
import { FEATURE_LABELS, PlanFeature } from '@/lib/planCapabilities';

interface Props {
  feature: PlanFeature;
  children: ReactNode;
  /** Optional inline mode: render an inline lock card instead of a full-page block */
  inline?: boolean;
}

export function PlanGate({ feature, children, inline }: Props) {
  const { loading, has, planCode } = usePlanAccess();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (has(feature)) return <>{children}</>;

  const card = (
    <div className="max-w-md mx-auto text-center p-6 rounded-2xl border border-border bg-card/70 backdrop-blur">
      <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-primary/10 flex items-center justify-center">
        <Lock className="w-6 h-6 text-primary" />
      </div>
      <h2 className="text-lg font-bold mb-1">Recurso bloqueado</h2>
      <p className="text-sm text-muted-foreground mb-4">
        <span className="font-medium text-foreground">{FEATURE_LABELS[feature]}</span> não está disponível no seu plano atual
        {planCode ? ` (${planCode})` : ''}. Faça upgrade para desbloquear.
      </p>
      <button
        onClick={() => navigate('/plans')}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-all"
      >
        <Crown size={16} /> Ver planos
      </button>
    </div>
  );

  if (inline) return card;

  return (
    <div className="min-h-screen bg-background pb-24 flex items-center justify-center px-4 safe-top">
      {card}
    </div>
  );
}
