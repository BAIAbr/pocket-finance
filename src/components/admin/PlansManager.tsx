import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Loader2, Save, Crown, Plus, Trash2, GripVertical } from 'lucide-react';
import { toast } from 'sonner';
import { normalizeFeatures, type PlanFeatureItem } from '@/hooks/useSubscription';
import { MoneyInput } from '@/components/ui/money-input';

interface Plan {
  id: string;
  code: string;
  name: string;
  description: string | null;
  price_monthly: number;
  features: PlanFeatureItem[];
  is_highlighted: boolean;
  sort_order: number;
  is_active: boolean;
  plan_group: string | null;
  billing_interval: string | null;
  interval_count: number | null;
  badge_label: string | null;
  badge_color: string | null;
  discount_percent: number | null;
}

const INTERVAL_OPTIONS = [
  { value: 'month', label: 'Mensal' },
  { value: 'quarter', label: 'Trimestral' },
  { value: 'semester', label: 'Semestral' },
  { value: 'year', label: 'Anual' },
];

export default function PlansManager() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('subscription_plans')
      .select('*')
      .order('sort_order', { ascending: true });
    if (error) {
      toast.error('Erro ao carregar planos');
    } else if (data) {
      setPlans(
        data.map((p: any) => ({
          ...p,
          features: normalizeFeatures(p.features),
        }))
      );
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const updateField = (id: string, patch: Partial<Plan>) => {
    setPlans((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  };

  const updateFeature = (planId: string, idx: number, patch: Partial<PlanFeatureItem>) => {
    setPlans((prev) => prev.map((p) => {
      if (p.id !== planId) return p;
      const features = p.features.map((f, i) => (i === idx ? { ...f, ...patch } : f));
      return { ...p, features };
    }));
  };

  const addFeature = (planId: string) => {
    setPlans((prev) => prev.map((p) =>
      p.id === planId ? { ...p, features: [...p.features, { label: '', enabled: true }] } : p
    ));
  };

  const removeFeature = (planId: string, idx: number) => {
    setPlans((prev) => prev.map((p) =>
      p.id === planId ? { ...p, features: p.features.filter((_, i) => i !== idx) } : p
    ));
  };

  const moveFeature = (planId: string, idx: number, dir: -1 | 1) => {
    setPlans((prev) => prev.map((p) => {
      if (p.id !== planId) return p;
      const next = [...p.features];
      const target = idx + dir;
      if (target < 0 || target >= next.length) return p;
      [next[idx], next[target]] = [next[target], next[idx]];
      return { ...p, features: next };
    }));
  };

  const save = async (plan: Plan) => {
    setSavingId(plan.id);
    const cleanFeatures = plan.features
      .map((f) => ({ label: f.label.trim(), enabled: f.enabled }))
      .filter((f) => f.label.length > 0);
    const { error } = await supabase
      .from('subscription_plans')
      .update({
        name: plan.name,
        description: plan.description,
        price_monthly: plan.price_monthly,
        features: cleanFeatures as any,
        is_highlighted: plan.is_highlighted,
        is_active: plan.is_active,
        sort_order: plan.sort_order,
        plan_group: plan.plan_group?.trim() || null,
        billing_interval: plan.billing_interval || null,
        interval_count: plan.interval_count ?? null,
        badge_label: plan.badge_label?.trim() || null,
        badge_color: plan.badge_color?.trim() || null,
        discount_percent: plan.discount_percent ?? null,
      } as any)
      .eq('id', plan.id);
    setSavingId(null);
    if (error) {
      toast.error('Erro ao salvar: ' + error.message);
    } else {
      toast.success(`Plano "${plan.name}" atualizado`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground">
        Edite preço, nome, descrição (múltiplas linhas permitidas) e ative/desative cada benefício. As mudanças aparecem imediatamente na página de Planos.
      </div>

      {plans.map((plan) => (
        <Card key={plan.id}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              {plan.is_highlighted && <Crown size={16} className="text-primary" />}
              {plan.name}
              <span className="text-xs font-normal text-muted-foreground">({plan.code})</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Nome</Label>
                <Input
                  value={plan.name}
                  onChange={(e) => updateField(plan.id, { name: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-xs">Preço mensal (R$)</Label>
                <MoneyInput
                  value={plan.price_monthly}
                  onChange={(v) =>
                    updateField(plan.id, { price_monthly: parseFloat(v) || 0 })
                  }
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs">Descrição (texto livre, quebras de linha permitidas)</Label>
              <Textarea
                rows={4}
                value={plan.description ?? ''}
                onChange={(e) => updateField(plan.id, { description: e.target.value })}
                placeholder="Escreva livremente. Enter cria nova linha."
                className="whitespace-pre-wrap"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-xs">Benefícios</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addFeature(plan.id)}
                  className="h-7 gap-1 text-xs"
                >
                  <Plus size={12} /> Adicionar
                </Button>
              </div>
              <div className="space-y-2">
                {plan.features.length === 0 && (
                  <p className="text-xs text-muted-foreground italic">Nenhum benefício. Clique em "Adicionar".</p>
                )}
                {plan.features.map((f, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 p-2 rounded-lg border border-border bg-secondary/30"
                  >
                    <div className="flex flex-col">
                      <button
                        type="button"
                        onClick={() => moveFeature(plan.id, idx, -1)}
                        disabled={idx === 0}
                        className="text-muted-foreground hover:text-foreground disabled:opacity-30 text-[10px] leading-none"
                        title="Mover para cima"
                      >▲</button>
                      <button
                        type="button"
                        onClick={() => moveFeature(plan.id, idx, 1)}
                        disabled={idx === plan.features.length - 1}
                        className="text-muted-foreground hover:text-foreground disabled:opacity-30 text-[10px] leading-none"
                        title="Mover para baixo"
                      >▼</button>
                    </div>
                    <Switch
                      checked={f.enabled}
                      onCheckedChange={(v) => updateFeature(plan.id, idx, { enabled: v })}
                    />
                    <Input
                      value={f.label}
                      onChange={(e) => updateFeature(plan.id, idx, { label: e.target.value })}
                      placeholder="Nome do benefício"
                      className="flex-1 h-9"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFeature(plan.id, idx)}
                      className="h-9 w-9 p-0 text-destructive hover:text-destructive"
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-muted-foreground mt-2">
                Use o interruptor para ativar/desativar cada benefício. Desativados aparecem riscados aos usuários.
              </p>
            </div>

            <div className="flex flex-wrap gap-4 pt-1">
              <div className="flex items-center gap-2">
                <Switch
                  checked={plan.is_highlighted}
                  onCheckedChange={(v) => updateField(plan.id, { is_highlighted: v })}
                />
                <Label className="text-xs">Destaque (Mais popular)</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={plan.is_active}
                  onCheckedChange={(v) => updateField(plan.id, { is_active: v })}
                />
                <Label className="text-xs">Ativo</Label>
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-xs">Ordem</Label>
                <Input
                  type="number"
                  className="w-20 h-8"
                  value={plan.sort_order}
                  onChange={(e) =>
                    updateField(plan.id, { sort_order: parseInt(e.target.value) || 0 })
                  }
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button
                size="sm"
                onClick={() => save(plan)}
                disabled={savingId === plan.id}
                className="gap-2"
              >
                {savingId === plan.id ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Save size={14} />
                )}
                Salvar
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
