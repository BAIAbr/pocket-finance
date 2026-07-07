// Machine-readable capabilities per plan code.
// The subscription_plans table stores price/name/description/features (display).
// Capabilities (feature gates) live here so they stay stable and type-safe.

export type PlanFeature =
  | 'ai'
  | 'recurring'
  | 'installments'
  | 'calendar'
  | 'family'
  | 'push'
  | 'customCdi'
  | 'advancedExport';

export interface PlanCapabilities {
  maxPiggyBanks: number; // -1 = unlimited
  features: Record<PlanFeature, boolean>;
}

export const PLAN_CAPABILITIES: Record<string, PlanCapabilities> = {
  free: {
    maxPiggyBanks: 1,
    features: {
      ai: false,
      recurring: false,
      installments: false,
      calendar: false,
      family: false,
      push: true,
      customCdi: false,
      advancedExport: false,
    },
  },
  pro: {
    maxPiggyBanks: -1,
    features: {
      ai: true,
      recurring: true,
      installments: true,
      calendar: true,
      family: false,
      push: true,
      customCdi: false,
      advancedExport: false,
    },
  },
  premium: {
    maxPiggyBanks: -1,
    features: {
      ai: true,
      recurring: true,
      installments: true,
      calendar: true,
      family: true,
      push: true,
      customCdi: true,
      advancedExport: true,
    },
  },
};

export const FEATURE_LABELS: Record<PlanFeature, string> = {
  ai: 'IA Financeira Avançada',
  recurring: 'Assinaturas & Contas Recorrentes',
  installments: 'Compras Parceladas',
  calendar: 'Calendário Financeiro',
  family: 'Modo Família',
  push: 'Notificações Push',
  customCdi: 'Rendimento CDI Personalizado',
  advancedExport: 'Exportação Avançada',
};

export function getCapabilities(planCode: string | undefined): PlanCapabilities {
  return PLAN_CAPABILITIES[planCode ?? 'free'] ?? PLAN_CAPABILITIES.free;
}
