import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Crown, Loader2 } from 'lucide-react';
import { usePlanAccess } from '@/hooks/usePlanAccess';
import { useFeatureFlags } from '@/contexts/FeatureFlagsContext';
import { FEATURE_LABELS, PlanFeature } from '@/lib/planCapabilities';

interface Props {
  feature?: PlanFeature;
  /** Feature flag slug (from feature_flags table). Takes precedence over `feature` when provided. */
  flag?: string;
  children: ReactNode;
  /** Optional inline mode: render an inline lock card instead of a full-page block */
  inline?: boolean;
}

export function PlanGate({ feature, flag, children, inline }: Props) {
  const { loading: planLoading, has, planCode } = usePlanAccess();
  const { loading: flagsLoading, hasFeature, flags } = useFeatureFlags();
  const loading = planLoading || flagsLoading;
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const allowed = flag ? hasFeature(flag) : feature ? has(feature) : true;
  if (allowed) return <>{children}</>;

  const label = flag
    ? (flags.find(f => f.slug === flag)?.name ?? flag)
    : feature
      ? FEATURE_LABELS[feature]
      : 'Este recurso';

  const card = (
    <div className="max-w-md mx-auto text-center p-6 rounded-2xl border border-border bg-card/70 backdrop-blur">
      <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-primary/10 flex items-center justify-center">
        <Lock className="w-6 h-6 text-primary" />
      </div>
      <h2 className="text-lg font-bold mb-1">Recurso bloqueado</h2>
      <p className="text-sm text-muted-foreground mb-4">
        <span className="font-medium text-foreground">{label}</span> não está disponível no seu plano atual
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
