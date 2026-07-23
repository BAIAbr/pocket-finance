import { useState } from 'react';
import { Plus, Trash2, Edit2, Power, AlertTriangle, Wand2, TrendingUp, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { MoneyInput } from '@/components/ui/money-input';
import { CreditCardRule, RuleType, useCreditCardRules } from '@/hooks/useCreditCardRules';

const TYPE_META: Record<RuleType, { label: string; description: string; icon: any }> = {
  category_limit: { label: 'Limite por categoria', description: 'Alerta quando os gastos na fatura ultrapassarem um valor em uma categoria', icon: TrendingUp },
  auto_category: { label: 'Auto-categorização', description: 'Aplica categoria automaticamente ao lançar compras com descrição parecida', icon: Wand2 },
  high_amount: { label: 'Compra de valor alto', description: 'Destaca compras acima do valor definido', icon: AlertTriangle },
};

interface Props {
  cardId: string;
  categories: any[];
}

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function CardRulesManager({ cardId, categories }: Props) {
  const { rules, rulesForCard, createRule, updateRule, deleteRule, toggleRule } = useCreditCardRules();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CreditCardRule | null>(null);

  const [rule_type, setRuleType] = useState<RuleType>('category_limit');
  const [name, setName] = useState('');
  const [scope, setScope] = useState<'card' | 'all'>('card');
  const [categoryId, setCategoryId] = useState<string>('');
  const [threshold, setThreshold] = useState(0);
  const [pattern, setPattern] = useState('');
  const [targetCategoryId, setTargetCategoryId] = useState<string>('');
  const [minAmount, setMinAmount] = useState(0);

  const cardRules = rulesForCard(cardId);

  const startNew = () => {
    setEditing(null);
    setRuleType('category_limit');
    setName('');
    setScope('card');
    setCategoryId('');
    setThreshold(0);
    setPattern('');
    setTargetCategoryId('');
    setMinAmount(0);
    setOpen(true);
  };

  const startEdit = (r: CreditCardRule) => {
    setEditing(r);
    setRuleType(r.rule_type);
    setName(r.name);
    setScope(r.card_id ? 'card' : 'all');
    if (r.rule_type === 'category_limit') {
      const c = r.config as any;
      setCategoryId(c.category_id ?? ''); setThreshold(Number(c.threshold ?? 0));
    } else if (r.rule_type === 'auto_category') {
      const c = r.config as any;
      setPattern(c.pattern ?? ''); setTargetCategoryId(c.target_category_id ?? '');
    } else {
      const c = r.config as any;
      setMinAmount(Number(c.min_amount ?? 0));
    }
    setOpen(true);
  };

  const save = async () => {
    if (!name.trim()) return;
    let config: any = {};
    if (rule_type === 'category_limit') {
      if (!categoryId || threshold <= 0) return;
      config = { category_id: categoryId, threshold };
    } else if (rule_type === 'auto_category') {
      if (!pattern.trim() || !targetCategoryId) return;
      config = { pattern: pattern.trim(), target_category_id: targetCategoryId };
    } else {
      if (minAmount <= 0) return;
      config = { min_amount: minAmount };
    }
    const payload = {
      rule_type,
      name: name.trim(),
      card_id: scope === 'all' ? null : cardId,
      is_active: editing?.is_active ?? true,
      config,
    };
    if (editing) await updateRule(editing.id, payload);
    else await createRule(payload);
    setOpen(false);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs text-muted-foreground">Alertas automáticos e auto-categorização de compras</div>
        <Button size="sm" onClick={startNew}><Plus className="w-3.5 h-3.5 mr-1" />Nova regra</Button>
      </div>

      {cardRules.length === 0 ? (
        <div className="text-center py-8 rounded-lg border border-dashed">
          <Bell className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
          <div className="text-sm text-muted-foreground">Nenhuma regra configurada</div>
          <div className="text-xs text-muted-foreground mt-1 px-6">
            Crie regras para receber alertas ou categorizar compras automaticamente
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {cardRules.map(r => {
            const meta = TYPE_META[r.rule_type];
            const Icon = meta.icon;
            const c = r.config as any;
            let detail = '';
            if (r.rule_type === 'category_limit') {
              const cat = categories.find(x => x.id === c.category_id)?.name ?? '—';
              detail = `${cat} • teto ${fmt(Number(c.threshold ?? 0))}`;
            } else if (r.rule_type === 'auto_category') {
              const cat = categories.find(x => x.id === c.target_category_id)?.name ?? '—';
              detail = `“${c.pattern}” → ${cat}`;
            } else {
              detail = `A partir de ${fmt(Number(c.min_amount ?? 0))}`;
            }
            return (
              <div key={r.id} className={`rounded-lg border p-3 ${!r.is_active ? 'opacity-60' : ''}`}>
                <div className="flex items-start gap-2">
                  <div className="rounded-lg p-2 bg-primary/10 text-primary shrink-0">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium truncate">{r.name}</div>
                    <div className="text-xs text-muted-foreground truncate">{meta.label}</div>
                    <div className="text-xs mt-1">{detail}</div>
                    {r.card_id === null && (
                      <div className="text-[10px] uppercase tracking-wide text-muted-foreground mt-1">Todos os cartões</div>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between mt-2 pt-2 border-t">
                  <button onClick={() => toggleRule(r.id, !r.is_active)} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
                    <Power className="w-3 h-3" />{r.is_active ? 'Ativa' : 'Pausada'}
                  </button>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => startEdit(r)}>
                      <Edit2 className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={async () => {
                      if (confirm('Remover esta regra?')) await deleteRule(r.id);
                    }}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar regra' : 'Nova regra'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Tipo</Label>
              <Select value={rule_type} onValueChange={v => setRuleType(v as RuleType)} disabled={!!editing}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(TYPE_META) as RuleType[]).map(t => (
                    <SelectItem key={t} value={t}>{TYPE_META[t].label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="text-xs text-muted-foreground mt-1">{TYPE_META[rule_type].description}</div>
            </div>

            <div>
              <Label>Nome</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ex.: Alerta de mercado" />
            </div>

            <div>
              <Label>Aplicar em</Label>
              <Select value={scope} onValueChange={v => setScope(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="card">Somente este cartão</SelectItem>
                  <SelectItem value="all">Todos os cartões</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {rule_type === 'category_limit' && (
              <>
                <div>
                  <Label>Categoria</Label>
                  <Select value={categoryId} onValueChange={setCategoryId}>
                    <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>
                      {categories.filter(c => c.type === 'expense').map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Teto por fatura</Label>
                  <MoneyInput value={threshold ? String(threshold) : ''} onChange={v => setThreshold(Number(v) || 0)} />
                </div>
              </>
            )}

            {rule_type === 'auto_category' && (
              <>
                <div>
                  <Label>Padrão de descrição</Label>
                  <Input value={pattern} onChange={e => setPattern(e.target.value)} placeholder="Ex.: uber, ifood | rappi" />
                  <div className="text-xs text-muted-foreground mt-1">
                    Use <code>|</code> para múltiplos termos e <code>*</code> como curinga
                  </div>
                </div>
                <div>
                  <Label>Categoria destino</Label>
                  <Select value={targetCategoryId} onValueChange={setTargetCategoryId}>
                    <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>
                      {categories.filter(c => c.type === 'expense').map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {rule_type === 'high_amount' && (
              <div>
                <Label>Alertar a partir de</Label>
                <MoneyInput value={minAmount} onValueChange={setMinAmount} />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={save}>{editing ? 'Salvar' : 'Criar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
