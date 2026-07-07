import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Loader2, Save, Crown } from 'lucide-react';
import { toast } from 'sonner';

interface Plan {
  id: string;
  code: string;
  name: string;
  description: string | null;
  price_monthly: number;
  features: string[];
  is_highlighted: boolean;
  sort_order: number;
  is_active: boolean;
}

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
          features: Array.isArray(p.features) ? p.features : [],
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

  const save = async (plan: Plan) => {
    setSavingId(plan.id);
    const { error } = await supabase
      .from('subscription_plans')
      .update({
        name: plan.name,
        description: plan.description,
        price_monthly: plan.price_monthly,
        features: plan.features,
        is_highlighted: plan.is_highlighted,
        is_active: plan.is_active,
        sort_order: plan.sort_order,
      })
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
        Edite preço, nome, descrição e benefícios de cada plano. As mudanças aparecem imediatamente na página de Planos.
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
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={plan.price_monthly}
                  onChange={(e) =>
                    updateField(plan.id, { price_monthly: parseFloat(e.target.value) || 0 })
                  }
                />
              </div>
            </div>

            <div>
              <Label className="text-xs">Descrição</Label>
              <Input
                value={plan.description ?? ''}
                onChange={(e) => updateField(plan.id, { description: e.target.value })}
              />
            </div>

            <div>
              <Label className="text-xs">Benefícios (um por linha)</Label>
              <Textarea
                rows={6}
                value={plan.features.join('\n')}
                onChange={(e) =>
                  updateField(plan.id, {
                    features: e.target.value.split('\n').map((s) => s.trim()).filter(Boolean),
                  })
                }
              />
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
