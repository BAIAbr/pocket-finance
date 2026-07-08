// Machine-readable capabilities per plan code.
// The subscription_plans table stores price/name/description/features (display).
// Capabilities (feature gates) live here so they stay stable and type-safe.

export type PlanFeature =
  | 'ai'
  | 'recurring'
  | 'installments'
  | 'family'
  | 'push'
  | 'customCdi'
  | 'advancedExport'
  | 'planning';

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
      family: false,
      push: true,
      customCdi: false,
      advancedExport: false,
      planning: false,
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
};

export function getCapabilities(planCode: string | undefined): PlanCapabilities {
  return PLAN_CAPABILITIES[planCode ?? 'free'] ?? PLAN_CAPABILITIES.free;
}
