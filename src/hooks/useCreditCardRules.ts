import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export type RuleType = 'category_limit' | 'auto_category' | 'high_amount';

export interface CategoryLimitConfig {
  category_id: string;
  threshold: number;
}
export interface AutoCategoryConfig {
  pattern: string;
  target_category_id: string;
}
export interface HighAmountConfig {
  min_amount: number;
}
export type RuleConfig = CategoryLimitConfig | AutoCategoryConfig | HighAmountConfig;

export interface CreditCardRule {
  id: string;
  user_id: string;
  card_id: string | null;
  rule_type: RuleType;
  name: string;
  is_active: boolean;
  config: RuleConfig;
  created_at: string;
  updated_at: string;
}

export interface RuleInput {
  card_id?: string | null;
  rule_type: RuleType;
  name: string;
  is_active?: boolean;
  config: RuleConfig;
}

export function useCreditCardRules() {
  const { user } = useAuth();
  const [rules, setRules] = useState<CreditCardRule[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    const { data } = await supabase.from('credit_card_rules' as any).select('*').order('created_at', { ascending: false });
    setRules(((data as any) ?? []) as CreditCardRule[]);
    setLoading(false);
  }, [user]);

  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    if (!user) return;
    const ch = supabase.channel('cc-rules-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'credit_card_rules' }, () => refresh())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, refresh]);

  const createRule = useCallback(async (input: RuleInput) => {
    if (!user) return;
    const { error } = await supabase.from('credit_card_rules' as any).insert({
      user_id: user.id,
      card_id: input.card_id ?? null,
      rule_type: input.rule_type,
      name: input.name,
      is_active: input.is_active ?? true,
      config: input.config as any,
    } as any);
    if (error) { toast.error('Erro: ' + error.message); throw error; }
    toast.success('Regra criada');
    await refresh();
  }, [user, refresh]);

  const updateRule = useCallback(async (id: string, patch: Partial<RuleInput>) => {
    const { error } = await supabase.from('credit_card_rules' as any).update(patch as any).eq('id', id);
    if (error) { toast.error('Erro: ' + error.message); throw error; }
    await refresh();
  }, [refresh]);

  const deleteRule = useCallback(async (id: string) => {
    const { error } = await supabase.from('credit_card_rules' as any).delete().eq('id', id);
    if (error) { toast.error('Erro: ' + error.message); throw error; }
    toast.success('Regra removida');
    await refresh();
  }, [refresh]);

  const toggleRule = useCallback(async (id: string, active: boolean) => {
    await updateRule(id, { is_active: active });
  }, [updateRule]);

  const rulesForCard = useCallback((cardId: string | null) => {
    return rules.filter(r => r.is_active && (r.card_id === null || r.card_id === cardId));
  }, [rules]);

  return { rules, loading, rulesForCard, createRule, updateRule, deleteRule, toggleRule, refresh };
}

/** Normalize a string for pattern comparison. */
function norm(s: string): string {
  return (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

/**
 * Given a description, find the first matching auto_category rule and
 * return its target category. Supports plain substring and simple wildcard `*`.
 */
export function resolveAutoCategory(
  description: string,
  rules: CreditCardRule[],
  cardId: string,
): string | null {
  const desc = norm(description);
  for (const r of rules) {
    if (r.rule_type !== 'auto_category' || !r.is_active) continue;
    if (r.card_id && r.card_id !== cardId) continue;
    const cfg = r.config as AutoCategoryConfig;
    if (!cfg?.pattern || !cfg?.target_category_id) continue;
    const raw = norm(cfg.pattern);
    const patterns = raw.split('|').map(p => p.trim()).filter(Boolean);
    for (const p of patterns) {
      if (p.includes('*')) {
        const re = new RegExp('^' + p.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$');
        if (re.test(desc)) return cfg.target_category_id;
      } else if (desc.includes(p)) {
        return cfg.target_category_id;
      }
    }
  }
  return null;
}
