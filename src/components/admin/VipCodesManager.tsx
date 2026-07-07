import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, Trash2, Copy, Crown, Link as LinkIcon, Eye, MousePointerClick, TrendingUp, DollarSign, ChevronDown, ChevronUp, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface VipCode {
  id: string;
  code: string;
  description: string | null;
  plan_code: string;
  duration_days: number;
  max_uses: number | null;
  uses_count: number;
  views_count: number;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
}

interface Plan { code: string; name: string; price_monthly: number }

interface Redemption {
  id: string;
  vip_code_id: string;
  user_id: string;
  plan_code: string;
  expires_at: string | null;
  redeemed_at: string;
  profile?: { name: string; email: string } | null;
}

export default function VipCodesManager() {
  const [codes, setCodes] = useState<VipCode[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [form, setForm] = useState({
    code: '',
    description: '',
    plan_code: '',
    duration_days: 30,
    max_uses: '' as string | number,
    expires_at: '',
  });

  const load = async () => {
    setLoading(true);
    const [{ data: c }, { data: p }, { data: r }] = await Promise.all([
      supabase.from('vip_codes').select('*').order('created_at', { ascending: false }),
      supabase.from('subscription_plans').select('code,name,price_monthly').eq('is_active', true).order('sort_order'),
      supabase.from('vip_redemptions').select('*').order('redeemed_at', { ascending: false }),
    ]);
    const reds = (r as Redemption[]) || [];
    // Fetch profiles for redemption users (admins can read all profiles)
    const userIds = Array.from(new Set(reds.map((x) => x.user_id)));
    let profileMap: Record<string, { name: string; email: string }> = {};
    if (userIds.length) {
      const { data: profs } = await supabase
        .from('profiles')
        .select('user_id,name,email')
        .in('user_id', userIds);
      (profs || []).forEach((pr: any) => {
        profileMap[pr.user_id] = { name: pr.name, email: pr.email };
      });
    }
    setCodes((c as VipCode[]) || []);
    setPlans((p as Plan[]) || []);
    setRedemptions(reds.map((x) => ({ ...x, profile: profileMap[x.user_id] ?? null })));
    if (p && p.length && !form.plan_code) {
      setForm((f) => ({ ...f, plan_code: p[0].code }));
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const buildLink = (code: string) => `${window.location.origin}/vip/${code}`;

  const handleCopy = async (code: string) => {
    try {
      await navigator.clipboard.writeText(buildLink(code));
      toast.success('Link copiado!');
    } catch {
      toast.error('Falha ao copiar');
    }
  };

  const handleCreate = async () => {
    const code = form.code.trim();
    if (!/^[A-Za-z0-9_-]{3,32}$/.test(code)) {
      toast.error('Código deve ter 3-32 caracteres (letras, números, _ ou -)');
      return;
    }
    if (!form.plan_code) return toast.error('Selecione um plano');
    setCreating(true);
    const { error } = await supabase.from('vip_codes').insert({
      code: code.toUpperCase(),
      description: form.description.trim() || null,
      plan_code: form.plan_code,
      duration_days: Number(form.duration_days) || 30,
      max_uses: form.max_uses === '' ? null : Number(form.max_uses),
      expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
    });
    setCreating(false);
    if (error) {
      toast.error(error.message.includes('duplicate') ? 'Este código já existe' : 'Erro ao criar código');
      return;
    }
    toast.success('Código criado');
    setForm({ ...form, code: '', description: '', max_uses: '', expires_at: '' });
    load();
  };

  const toggleActive = async (id: string, value: boolean) => {
    const { error } = await supabase.from('vip_codes').update({ is_active: value }).eq('id', id);
    if (error) toast.error('Erro ao atualizar');
    else { setCodes((cs) => cs.map((c) => c.id === id ? { ...c, is_active: value } : c)); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir este código? As ativações já realizadas serão mantidas.')) return;
    const { error } = await supabase.from('vip_codes').delete().eq('id', id);
    if (error) toast.error('Erro ao excluir');
    else { setCodes((cs) => cs.filter((c) => c.id !== id)); toast.success('Removido'); }
  };

  const planByCode = (code: string) => plans.find((p) => p.code === code);
  const currency = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const revenueFor = (c: VipCode) => {
    const plan = planByCode(c.plan_code);
    if (!plan) return 0;
    const months = Math.max(1, c.duration_days / 30);
    return plan.price_monthly * months * c.uses_count;
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><Crown size={16} /> Novo código VIP</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1">
            <Label>Código</Label>
            <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="EX: BLACKFRIDAY" />
          </div>
          <div className="space-y-1">
            <Label>Plano</Label>
            <Select value={form.plan_code} onValueChange={(v) => setForm({ ...form, plan_code: v })}>
              <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
              <SelectContent>
                {plans.map((p) => <SelectItem key={p.code} value={p.code}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Duração (dias)</Label>
            <Input type="number" min={1} value={form.duration_days} onChange={(e) => setForm({ ...form, duration_days: Number(e.target.value) })} />
          </div>
          <div className="space-y-1">
            <Label>Limite de usos (opcional)</Label>
            <Input type="number" min={1} value={form.max_uses} onChange={(e) => setForm({ ...form, max_uses: e.target.value })} placeholder="Ilimitado" />
          </div>
          <div className="space-y-1 md:col-span-2">
            <Label>Descrição (opcional)</Label>
            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
          </div>
          <div className="space-y-1">
            <Label>Expira em (opcional)</Label>
            <Input type="datetime-local" value={form.expires_at} onChange={(e) => setForm({ ...form, expires_at: e.target.value })} />
          </div>
          <div className="flex items-end">
            <Button className="w-full" onClick={handleCreate} disabled={creating}>
              {creating ? <Loader2 className="animate-spin mr-2" size={14} /> : <Plus className="mr-2" size={14} />}
              Criar código
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Resumo geral */}
      {!loading && codes.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <StatBox icon={<Eye size={14} />} label="Visualizações" value={codes.reduce((s, c) => s + (c.views_count || 0), 0).toString()} />
          <StatBox icon={<MousePointerClick size={14} />} label="Ativações" value={codes.reduce((s, c) => s + (c.uses_count || 0), 0).toString()} />
          <StatBox icon={<TrendingUp size={14} />} label="Conversão média" value={(() => {
            const v = codes.reduce((s, c) => s + (c.views_count || 0), 0);
            const u = codes.reduce((s, c) => s + (c.uses_count || 0), 0);
            return v ? `${((u / v) * 100).toFixed(1)}%` : '—';
          })()} />
          <StatBox icon={<DollarSign size={14} />} label="Receita estimada" value={currency(codes.reduce((s, c) => s + revenueFor(c), 0))} />
        </div>
      )}

      <Card>
        <CardHeader><CardTitle className="text-base">Códigos e estatísticas</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="animate-spin" size={14} /> Carregando…</div>
          ) : codes.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum código criado ainda.</p>
          ) : (
            <div className="space-y-2">
              {codes.map((c) => {
                const plan = planByCode(c.plan_code);
                const conv = c.views_count > 0 ? (c.uses_count / c.views_count) * 100 : 0;
                const codeReds = redemptions.filter((r) => r.vip_code_id === c.id);
                const isOpen = expanded === c.id;
                return (
                  <div key={c.id} className="border rounded-lg p-3 space-y-2">
                    <div className="flex flex-col md:flex-row md:items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-semibold">{c.code}</span>
                          <Badge variant={c.is_active ? 'default' : 'secondary'}>{c.is_active ? 'Ativo' : 'Inativo'}</Badge>
                          <Badge variant="outline">{plan?.name ?? c.plan_code}</Badge>
                          <Badge variant="outline">{c.duration_days}d</Badge>
                        </div>
                        <div className="text-xs text-muted-foreground font-mono truncate mt-1 flex items-center gap-1">
                          <LinkIcon size={12} /> {buildLink(c.code)}
                        </div>
                        {c.description && <p className="text-xs text-muted-foreground mt-1">{c.description}</p>}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Switch checked={c.is_active} onCheckedChange={(v) => toggleActive(c.id, v)} />
                        <Button size="sm" variant="outline" onClick={() => handleCopy(c.code)}>
                          <Copy size={14} className="mr-1" /> Copiar
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleDelete(c.id)}>
                          <Trash2 size={14} className="text-destructive" />
                        </Button>
                      </div>
                    </div>

                    {/* Stats row */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-2 pt-2 border-t border-border/50">
                      <MiniStat icon={<Eye size={12} />} label="Views" value={c.views_count.toString()} />
                      <MiniStat icon={<MousePointerClick size={12} />} label="Ativações" value={`${c.uses_count}${c.max_uses ? `/${c.max_uses}` : ''}`} />
                      <MiniStat icon={<TrendingUp size={12} />} label="Conversão" value={c.views_count ? `${conv.toFixed(1)}%` : '—'} />
                      <MiniStat icon={<DollarSign size={12} />} label="Receita est." value={currency(revenueFor(c))} />
                      <MiniStat icon={<Calendar size={12} />} label="Criado" value={new Date(c.created_at).toLocaleDateString('pt-BR')} />
                    </div>

                    {codeReds.length > 0 && (
                      <>
                        <button
                          onClick={() => setExpanded(isOpen ? null : c.id)}
                          className="w-full flex items-center justify-center gap-1 text-xs text-primary hover:underline pt-1"
                        >
                          {isOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                          {isOpen ? 'Ocultar' : `Ver ${codeReds.length} ativação${codeReds.length > 1 ? 'ões' : ''}`}
                        </button>
                        {isOpen && (
                          <div className="space-y-1 pt-1">
                            {codeReds.map((r) => (
                              <div key={r.id} className="flex items-center justify-between text-xs bg-secondary/40 rounded-md px-2 py-1.5">
                                <div className="min-w-0 flex-1">
                                  <p className="font-medium truncate">{r.profile?.name ?? '—'}</p>
                                  <p className="text-muted-foreground truncate">{r.profile?.email ?? r.user_id.slice(0, 8)}</p>
                                </div>
                                <div className="text-right shrink-0 ml-2">
                                  <p className="font-mono">{new Date(r.redeemed_at).toLocaleDateString('pt-BR')} {new Date(r.redeemed_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
                                  {r.expires_at && <p className="text-muted-foreground">expira {new Date(r.expires_at).toLocaleDateString('pt-BR')}</p>}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatBox({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg border p-3 bg-card">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">{icon}{label}</div>
      <p className="text-lg font-semibold mt-1 font-mono">{value}</p>
    </div>
  );
}

function MiniStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="text-xs">
      <div className="flex items-center gap-1 text-muted-foreground">{icon}{label}</div>
      <p className={cn("font-mono font-medium mt-0.5 truncate")}>{value}</p>
    </div>
  );
}
