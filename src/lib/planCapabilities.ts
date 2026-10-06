// Machine-readable capabilities per plan code.

export type PlanFeature =
  | 'ai'
  | 'recurring'
  | 'installments'
  | 'family'
  | 'push'
  | 'customCdi'
  | 'advancedExport'
  | 'planning'
  | 'investments';

export interface PlanCapabilities {
  maxPiggyBanks: number;
  features: Record<PlanFeature, boolean>;
}

export const PLAN_CAPABILITIES: Record<string, PlanCapabilities> = {
  free: {
    maxPiggyBanks: 1,
    features: {
      ai: false,
      recurring: false,
      installments: false,
      family: false,
      push: true,
      customCdi: false,
      advancedExport: false,
      planning: false,
      investments: true,
    },
  },
  pro: {
    maxPiggyBanks: -1,
    features: {
      ai: true,
      recurring: true,
      installments: true,
      family: false,
      push: true,
      customCdi: false,
      advancedExport: false,
      planning: true,
      investments: true,
    },
  },
  premium: {
    maxPiggyBanks: -1,
    features: {
      ai: true,
      recurring: true,
      installments: true,
      family: true,
      push: true,
      customCdi: true,
      advancedExport: true,
      planning: true,
      investments: true,
    },
  },
};

export const FEATURE_LABELS: Record<PlanFeature, string> = {
  ai: 'IA Financeira Avançada',
  recurring: 'Assinaturas & Contas Recorrentes',
  installments: 'Compras Parceladas',
  family: 'Modo Família',
  push: 'Notificações Push',
  customCdi: 'Rendimento CDI Personalizado',
  advancedExport: 'Exportação Avançada',
  planning: 'Planejamento Financeiro Inteligente',
  investments: 'Central de Investimentos',
};

/**
 * Billing variations that share the capabilities of a base plan.
 * Only codes listed here are reclassified; any other code keeps its own entry (or falls back to free).
 */
export const PLAN_FAMILY: Record<string, string> = {
  premium: 'premium',
  premium_yearly: 'premium',
  premium_quarterly: 'premium',
  premium_semester: 'premium',
};

export function resolvePlanFamily(planCode: string | undefined): string {
  const code = planCode ?? 'free';
  return PLAN_FAMILY[code] ?? code;
}

/** Statuses that grant paid benefits — mirrors the backend `user_plan_code()` rule. */
export const ENTITLED_STATUSES = ['active', 'trial', 'vip'];

/** Plan code whose benefits a subscription actually grants (free when pending/cancelled/expired). */
export function entitledPlanCode(
  sub: { plan_code?: string | null; status?: string | null; expires_at?: string | null } | null | undefined,
): string {
  if (!sub?.plan_code) return 'free';
  if (!ENTITLED_STATUSES.includes(sub.status ?? '')) return 'free';
  if (sub.expires_at && new Date(sub.expires_at).getTime() <= Date.now()) return 'free';
  return sub.plan_code;
}

export function getCapabilities(planCode: string | undefined): PlanCapabilities {
  return PLAN_CAPABILITIES[resolvePlanFamily(planCode)] ?? PLAN_CAPABILITIES.free;
}
