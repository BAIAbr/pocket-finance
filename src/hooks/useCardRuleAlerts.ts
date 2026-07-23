import { useMemo } from 'react';
import { CreditCardRule, CategoryLimitConfig, HighAmountConfig } from './useCreditCardRules';
import { CreditCardInstallment, CreditCardInvoice, CreditCardPurchase } from './useCreditCards';

export type RuleAlertSeverity = 'info' | 'warning' | 'danger';

export interface RuleAlert {
  id: string;
  ruleId: string;
  ruleName: string;
  severity: RuleAlertSeverity;
  title: string;
  description: string;
  value?: string;
}

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

interface Params {
  cardId: string;
  rules: CreditCardRule[];
  currentInvoice: CreditCardInvoice | null | undefined;
  installments: CreditCardInstallment[];
  purchases: CreditCardPurchase[];
  categoryName: (id: string | null) => string;
}

export function useCardRuleAlerts({ cardId, rules, currentInvoice, installments, purchases, categoryName }: Params): RuleAlert[] {
  return useMemo(() => {
    const alerts: RuleAlert[] = [];
    const applicable = rules.filter(r => r.is_active && (r.card_id === null || r.card_id === cardId));
    if (!currentInvoice) return alerts;

    const invInstallments = installments.filter(i => i.invoice_id === currentInvoice.id);

    for (const rule of applicable) {
      if (rule.rule_type === 'category_limit') {
        const cfg = rule.config as CategoryLimitConfig;
        if (!cfg?.category_id || !cfg?.threshold) continue;
        let spent = 0;
        for (const inst of invInstallments) {
          const p = purchases.find(x => x.id === inst.purchase_id);
          if (p?.category_id === cfg.category_id) spent += Number(inst.amount);
        }
        if (spent > 0) {
          const pct = (spent / cfg.threshold) * 100;
          if (pct >= 80) {
            alerts.push({
              id: `${rule.id}-catlimit`,
              ruleId: rule.id,
              ruleName: rule.name,
              severity: pct >= 100 ? 'danger' : 'warning',
              title: pct >= 100 ? `Limite estourado: ${categoryName(cfg.category_id)}` : `Limite quase no teto: ${categoryName(cfg.category_id)}`,
              description: `Você já gastou ${fmt(spent)} de ${fmt(cfg.threshold)} nesta categoria na fatura atual (${pct.toFixed(0)}%).`,
              value: fmt(spent),
            });
          }
        }
      }

      if (rule.rule_type === 'high_amount') {
        const cfg = rule.config as HighAmountConfig;
        if (!cfg?.min_amount) continue;
        const flagged: { desc: string; amount: number }[] = [];
        for (const inst of invInstallments) {
          const p = purchases.find(x => x.id === inst.purchase_id);
          if (!p) continue;
          if (Number(p.total_amount) >= cfg.min_amount && inst.installment_number === 1) {
            flagged.push({ desc: p.description, amount: Number(p.total_amount) });
          }
        }
        if (flagged.length > 0) {
          const top = flagged.sort((a, b) => b.amount - a.amount).slice(0, 3);
          alerts.push({
            id: `${rule.id}-highamt`,
            ruleId: rule.id,
            ruleName: rule.name,
            severity: 'warning',
            title: `${flagged.length} compra(s) acima de ${fmt(cfg.min_amount)}`,
            description: top.map(t => `${t.desc} · ${fmt(t.amount)}`).join(' • '),
          });
        }
      }
    }
    return alerts;
  }, [cardId, rules, currentInvoice, installments, purchases, categoryName]);
}
