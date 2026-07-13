import { useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useFeatureFlags, type FeatureFlag } from '@/contexts/FeatureFlagsContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Search, Copy, Trash2, Pencil, Flag, Gauge, Layers } from 'lucide-react';
import { toast } from 'sonner';

const CATEGORIES = [
  'Dashboard','Planejamento','Investimentos','IA','Relatórios','Backup',
  'Importação','Exportação','Premium','Família','Laboratório','Administração','Integrações','Geral',
];

export default function FeatureFlagsManager() {
  const { flags, plans, planFeatures, planLimits, refresh, loading } = useFeatureFlags();
  const [tab, setTab] = useState('flags');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string>('all');
  const [editing, setEditing] = useState<Partial<FeatureFlag> | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return flags.filter(f =>
      (category === 'all' || f.category === category) &&
      (!q || f.slug.toLowerCase().includes(q) || f.name.toLowerCase().includes(q))
    );
  }, [flags, search, category]);

  const grouped = useMemo(() => {
    const g: Record<string, FeatureFlag[]> = {};
    for (const f of filtered) (g[f.category] ||= []).push(f);
    return g;
  }, [filtered]);

  const savePlanFeature = async (planId: string, featureId: string, enabled: boolean) => {
    const existing = planFeatures.find(p => p.plan_id === planId && p.feature_id === featureId);
    if (existing) {
      const { error } = await supabase.from('plan_features').update({ enabled }).eq('id', existing.id);
      if (error) return toast.error(error.message);
    } else {
      const { error } = await supabase.from('plan_features').insert({ plan_id: planId, feature_id: featureId, enabled });
      if (error) return toast.error(error.message);
    }
    toast.success('Atualizado');
    refresh();
  };

  const savePlanLimit = async (planId: string, key: string, value: number, description?: string) => {
    const existing = planLimits.find(l => l.plan_id === planId && l.key === key);
    if (existing) {
      const { error } = await supabase.from('plan_limits').update({ value, description: description ?? existing.description }).eq('id', existing.id);
      if (error) return toast.error(error.message);
    } else {
      const { error } = await supabase.from('plan_limits').insert({ plan_id: planId, key, value, description });
      if (error) return toast.error(error.message);
    }
    toast.success('Limite salvo');
    refresh();
  };

  const saveFlag = async () => {
    if (!editing) return;
    const payload = {
      slug: (editing.slug ?? '').trim(),
      name: (editing.name ?? '').trim(),
      description: editing.description ?? null,
      category: editing.category ?? 'Geral',
      icon: editing.icon ?? null,
      active: editing.active ?? true,
    };
    if (!payload.slug || !payload.name) return toast.error('Slug e nome são obrigatórios');
    if (editing.id) {
      const { error } = await supabase.from('feature_flags').update(payload).eq('id', editing.id);
      if (error) return toast.error(error.message);
    } else {
      const { error } = await supabase.from('feature_flags').insert(payload);
      if (error) return toast.error(error.message);
    }
    setEditing(null);
    toast.success('Salvo');
    refresh();
  };

  const deleteFlag = async (id: string) => {
    if (!confirm('Excluir esta funcionalidade? Ela será removida de todos os planos.')) return;
    const { error } = await supabase.from('feature_flags').delete().eq('id', id);
    if (error) return toast.error(error.message);
    toast.success('Excluída');
    refresh();
  };

  const duplicateFlag = (f: FeatureFlag) => {
    setEditing({
      slug: `${f.slug}_copy`,
      name: `${f.name} (cópia)`,
      description: f.description,
      category: f.category,
      icon: f.icon,
      active: true,
    });
  };

  const toggleActive = async (f: FeatureFlag) => {
    const { error } = await supabase.from('feature_flags').update({ active: !f.active }).eq('id', f.id);
    if (error) return toast.error(error.message);
    refresh();
  };

  return (
    <div className="space-y-4">
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid grid-cols-3 w-full max-w-md">
          <TabsTrigger value="flags"><Flag size={14} className="mr-1.5" />Funcionalidades</TabsTrigger>
          <TabsTrigger value="matrix"><Layers size={14} className="mr-1.5" />Planos × Features</TabsTrigger>
          <TabsTrigger value="limits"><Gauge size={14} className="mr-1.5" />Limites</TabsTrigger>
        </TabsList>

        {/* Flags catalog */}
        <TabsContent value="flags" className="space-y-3 mt-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Buscar por slug ou nome" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-full sm:w-56"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas categorias</SelectItem>
                {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button onClick={() => setEditing({ active: true, category: 'Geral' })} className="gap-1.5">
              <Plus size={16} /> Nova
            </Button>
          </div>

          {loading && <p className="text-sm text-muted-foreground">Carregando...</p>}

          {Object.entries(grouped).map(([cat, items]) => (
            <Card key={cat}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  {cat} <Badge variant="secondary" className="text-xs">{items.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {items.map(f => (
                  <div key={f.id} className="flex items-center gap-3 p-2 rounded-lg bg-secondary/40">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-sm truncate">{f.name}</p>
                        <code className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">{f.slug}</code>
                        {!f.active && <Badge variant="destructive" className="text-[10px]">Inativa</Badge>}
                      </div>
                      {f.description && <p className="text-xs text-muted-foreground truncate">{f.description}</p>}
                    </div>
                    <Switch checked={f.active} onCheckedChange={() => toggleActive(f)} />
                    <Button size="icon" variant="ghost" onClick={() => setEditing(f)}><Pencil size={14} /></Button>
                    <Button size="icon" variant="ghost" onClick={() => duplicateFlag(f)}><Copy size={14} /></Button>
                    <Button size="icon" variant="ghost" onClick={() => deleteFlag(f.id)}><Trash2 size={14} className="text-destructive" /></Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Matrix: Plans × Features */}
        <TabsContent value="matrix" className="mt-4">
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-secondary/40 sticky top-0">
                  <tr>
                    <th className="text-left p-3 font-medium">Funcionalidade</th>
                    {plans.map(p => (
                      <th key={p.id} className="p-3 font-medium text-center min-w-[100px]">{p.name}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {flags.map(f => (
                    <tr key={f.id} className="border-t border-border">
                      <td className="p-3">
                        <p className="font-medium">{f.name}</p>
                        <code className="text-[10px] text-muted-foreground">{f.slug}</code>
                      </td>
                      {plans.map(p => {
                        const pf = planFeatures.find(x => x.plan_id === p.id && x.feature_id === f.id);
                        const enabled = pf?.enabled ?? false;
                        return (
                          <td key={p.id} className="p-3 text-center">
                            <Switch checked={enabled} onCheckedChange={(v) => savePlanFeature(p.id, f.id, v)} />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Limits */}
        <TabsContent value="limits" className="mt-4 space-y-3">
          {plans.map(p => {
            const rows = planLimits.filter(l => l.plan_id === p.id);
            return (
              <Card key={p.id}>
                <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
                  <CardTitle className="text-sm">{p.name}</CardTitle>
                  <NewLimitButton planId={p.id} onSave={savePlanLimit} />
                </CardHeader>
                <CardContent className="space-y-2">
                  {rows.length === 0 && <p className="text-xs text-muted-foreground">Sem limites configurados.</p>}
                  {rows.map(l => (
                    <div key={l.id} className="flex items-center gap-2 p-2 rounded-lg bg-secondary/40">
                      <div className="flex-1 min-w-0">
                        <code className="text-xs font-mono">{l.key}</code>
                        {l.description && <p className="text-xs text-muted-foreground truncate">{l.description}</p>}
                      </div>
                      <Input
                        type="number"
                        defaultValue={l.value}
                        className="w-28 h-8"
                        onBlur={(e) => {
                          const v = parseInt(e.target.value, 10);
                          if (!isNaN(v) && v !== l.value) savePlanLimit(p.id, l.key, v, l.description ?? undefined);
                        }}
                      />
                      <span className="text-xs text-muted-foreground w-16">{l.value === -1 ? 'ilimitado' : ''}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>
      </Tabs>

      {/* Editor modal */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing?.id ? 'Editar funcionalidade' : 'Nova funcionalidade'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground">Slug</label>
              <Input value={editing?.slug ?? ''} onChange={e => setEditing({ ...editing, slug: e.target.value })} placeholder="feature_slug" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Nome</label>
              <Input value={editing?.name ?? ''} onChange={e => setEditing({ ...editing, name: e.target.value })} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Categoria</label>
              <Select value={editing?.category ?? 'Geral'} onValueChange={v => setEditing({ ...editing, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Descrição</label>
              <Textarea value={editing?.description ?? ''} onChange={e => setEditing({ ...editing, description: e.target.value })} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Ícone (lucide)</label>
              <Input value={editing?.icon ?? ''} onChange={e => setEditing({ ...editing, icon: e.target.value })} placeholder="Sparkles" />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={editing?.active ?? true} onCheckedChange={v => setEditing({ ...editing, active: v })} />
              <span className="text-sm">Ativa</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancelar</Button>
            <Button onClick={saveFlag}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function NewLimitButton({ planId, onSave }: { planId: string; onSave: (planId: string, key: string, value: number, description?: string) => Promise<unknown> }) {
  const [open, setOpen] = useState(false);
  const [key, setKey] = useState('');
  const [value, setValue] = useState('0');
  const [description, setDescription] = useState('');
  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)} className="gap-1"><Plus size={14} /> Limite</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Novo limite</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="chave (ex.: accounts_limit)" value={key} onChange={e => setKey(e.target.value)} />
            <Input type="number" placeholder="valor (-1 = ilimitado)" value={value} onChange={e => setValue(e.target.value)} />
            <Input placeholder="descrição" value={description} onChange={e => setDescription(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={async () => {
              if (!key.trim()) return toast.error('Chave é obrigatória');
              await onSave(planId, key.trim(), parseInt(value, 10) || 0, description);
              setOpen(false); setKey(''); setValue('0'); setDescription('');
            }}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
