import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Loader2, Plus, Trash2, Copy, Crown, Link as LinkIcon, Eye, MousePointerClick, TrendingUp,
  DollarSign, ChevronDown, ChevronUp, Calendar, Search, Share2, Archive, Play, Pause,
  CopyPlus, Wand2, CalendarDays, Users, Gift,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis,
} from 'recharts';

/* ---------------------------------- types --------------------------------- */

interface VipCode {
  id: string;
  code: string;
  internal_name: string | null;
  description: string | null;
  plan_code: string;
  code_type: string;
  benefit_type: string;
  discount_percent: number | null;
  discount_amount: number | null;
  is_lifetime: boolean;
  campaign_source: string;
  campaign_label: string | null;
  duration_days: number;
  max_uses: number | null;
  uses_count: number;
  views_count: number;
  single_use_per_user: boolean;
  unlimited: boolean;
  status: string;
  starts_at: string | null;
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
  days_granted: number | null;
  source_campaign: string | null;
  device: string | null;
  profile?: { name: string; email: string } | null;
}

/* -------------------------------- constants -------------------------------- */

const CODE_TYPES = [
  { value: 'premium', label: 'Premium' },
  { value: 'discount', label: 'Desconto' },
  { value: 'invite', label: 'Convite' },
  { value: 'influencer', label: 'Influenciador' },
  { value: 'partner', label: 'Parceiro' },
  { value: 'employee', label: 'Funcionário' },
  { value: 'beta', label: 'Beta' },
];

const SOURCES = [
  { value: 'tiktok', label: 'TikTok' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'google', label: 'Google' },
  { value: 'influencer', label: 'Influenciador' },
  { value: 'affiliate', label: 'Afiliado' },
  { value: 'partner', label: 'Parceiro' },
  { value: 'organic', label: 'Orgânico' },
  { value: 'custom', label: 'Personalizado' },
];

const BENEFITS = [
  { value: 'days', label: 'Dias Premium' },
  { value: 'lifetime', label: 'Vitalício' },
  { value: 'percent_discount', label: 'Desconto (%)' },
  { value: 'fixed_discount', label: 'Desconto (R$)' },
];

const DAY_PRESETS = [30, 90, 180, 365];

const STATUS_LABEL: Record<string, string> = {
  active: 'Ativo', paused: 'Pausado', expired: 'Expirado', archived: 'Arquivado',
};

const FILTERS = [
  { value: 'all', label: 'Todos' },
  { value: 'active', label: 'Ativos' },
  { value: 'expired', label: 'Expirados' },
  { value: 'most_used', label: 'Mais utilizados' },
  { value: 'never_used', label: 'Nunca utilizados' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'influencer', label: 'Influenciadores' },
];

const PAGE_SIZE = 25;

const label = (list: { value: string; label: string }[], v: string) =>
  list.find((i) => i.value === v)?.label ?? v;

const currency = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const emptyForm = {
  internal_name: '',
  code: '',
  code_type: 'premium',
  benefit_type: 'days',
  duration_days: 30,
  discount_percent: '' as string | number,
  discount_amount: '' as string | number,
  campaign_source: 'organic',
  campaign_label: '',
  description: '',
  plan_code: '',
  starts_at: '',
  expires_at: '',
  no_expiration: true,
  max_uses: '' as string | number,
  unlimited: true,
  single_use_per_user: true,
  status: 'active',
};

type FormState = typeof emptyForm;

function randomCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 8 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('');
}

function effectiveStatus(c: VipCode) {
  if (c.status === 'archived') return 'archived';
  if (c.expires_at && new Date(c.expires_at) < new Date()) return 'expired';
  if (c.status === 'paused' || !c.is_active) return 'paused';
  return 'active';
}

/* -------------------------------- component -------------------------------- */

export default function VipCodesManager() {
  const [codes, setCodes] = useState<VipCode[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [form, setForm] = useState<FormState>(emptyForm);

  const load = async () => {
    setLoading(true);
    const [{ data: c }, { data: p }, { data: r }] = await Promise.all([
      supabase.from('vip_codes').select('*').order('created_at', { ascending: false }),
      supabase.from('subscription_plans').select('code,name,price_monthly').eq('is_active', true).order('sort_order'),
      supabase.from('vip_redemptions').select('*').order('redeemed_at', { ascending: false }).limit(1000),
    ]);
    const reds = (r as Redemption[]) || [];
    const userIds = Array.from(new Set(reds.map((x) => x.user_id)));
    const profileMap: Record<string, { name: string; email: string }> = {};
    if (userIds.length) {
      const { data: profs } = await supabase
        .from('profiles')
        .select('user_id,name,email')
        .in('user_id', userIds);
      (profs || []).forEach((pr) => {
        profileMap[pr.user_id] = { name: pr.name, email: pr.email };
      });
    }
    setCodes((c as VipCode[]) || []);
    setPlans((p as Plan[]) || []);
    setRedemptions(reds.map((x) => ({ ...x, profile: profileMap[x.user_id] ?? null })));
    if (p && p.length) setForm((f) => ({ ...f, plan_code: f.plan_code || p[0].code }));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);
  useEffect(() => { setPage(1); }, [search, filter]);

  const buildLink = (code: string) => `${window.location.origin}/#/c/${code}`;

  const copy = async (text: string, msg: string) => {
    try { await navigator.clipboard.writeText(text); toast.success(msg); }
    catch { toast.error('Falha ao copiar'); }
  };

  const share = async (c: VipCode) => {
    const url = buildLink(c.code);
    if (navigator.share) {
      try { await navigator.share({ title: 'Finango — Código VIP', text: `Use o código ${c.code}`, url }); return; }
      catch { /* cancelled */ }
    }
    copy(url, 'Link copiado!');
  };

  /* ------------------------------- mutations ------------------------------ */

  const openCreate = () => {
    setForm({ ...emptyForm, plan_code: plans[0]?.code ?? '' });
    setModalOpen(true);
  };

  const openDuplicate = (c: VipCode) => {
    setForm({
      internal_name: c.internal_name ? `${c.internal_name} (cópia)` : '',
      code: `${c.code}-${randomCode().slice(0, 4)}`,
      code_type: c.code_type,
      benefit_type: c.benefit_type,
      duration_days: c.duration_days,
      discount_percent: c.discount_percent ?? '',
      discount_amount: c.discount_amount ?? '',
      campaign_source: c.campaign_source,
      campaign_label: c.campaign_label ?? '',
      description: c.description ?? '',
      plan_code: c.plan_code,
      starts_at: '',
      expires_at: '',
      no_expiration: !c.expires_at,
      max_uses: c.max_uses ?? '',
      unlimited: c.unlimited,
      single_use_per_user: c.single_use_per_user,
      status: 'active',
    });
    setModalOpen(true);
  };

  const handleCreate = async () => {
    const code = form.code.trim().toUpperCase();
    if (!/^[A-Za-z0-9_-]{3,32}$/.test(code)) {
      toast.error('Código deve ter 3-32 caracteres (letras, números, _ ou -)');
      return;
    }
    if (!form.plan_code) return toast.error('Selecione um plano');
    if (form.benefit_type === 'percent_discount' && !form.discount_percent) return toast.error('Informe o percentual de desconto');
    if (form.benefit_type === 'fixed_discount' && !form.discount_amount) return toast.error('Informe o valor do desconto');

    setSaving(true);
    const { data: userRes } = await supabase.auth.getUser();
    const { data: inserted, error } = await supabase.from('vip_codes').insert({
      code,
      internal_name: form.internal_name.trim() || null,
      description: form.description.trim() || null,
      plan_code: form.plan_code,
      code_type: form.code_type,
      benefit_type: form.benefit_type,
      is_lifetime: form.benefit_type === 'lifetime',
      duration_days: form.benefit_type === 'lifetime' ? 36500 : Number(form.duration_days) || 30,
      discount_percent: form.benefit_type === 'percent_discount' ? Number(form.discount_percent) : null,
      discount_amount: form.benefit_type === 'fixed_discount' ? Number(form.discount_amount) : null,
      campaign_source: form.campaign_source,
      campaign_label: form.campaign_label.trim() || null,
      starts_at: form.starts_at ? new Date(form.starts_at).toISOString() : null,
      expires_at: !form.no_expiration && form.expires_at ? new Date(form.expires_at).toISOString() : null,
      max_uses: form.unlimited || form.max_uses === '' ? null : Number(form.max_uses),
      unlimited: form.unlimited,
      single_use_per_user: form.single_use_per_user,
      status: form.status,
      is_active: form.status === 'active',
      created_by: userRes?.user?.id ?? null,
    }).select('id').maybeSingle();
    setSaving(false);
    if (error) {
      toast.error(error.message.includes('duplicate') || error.message.includes('unique') ? 'Este código já existe' : 'Erro ao criar código');
      return;
    }
    await logEvent(inserted?.id ?? null, code, 'created', { plan_code: form.plan_code });
    toast.success('Código criado');
    setModalOpen(false);
    load();
  };

  const logEvent = async (id: string | null, code: string, action: string, metadata: Record<string, unknown> = {}) => {
    const { data: userRes } = await supabase.auth.getUser();
    await supabase.from('vip_code_events').insert({
      vip_code_id: id, code, actor_id: userRes?.user?.id ?? null, action, metadata,
    });
  };

  const setStatus = async (c: VipCode, status: string) => {
    const patch: Record<string, unknown> = { status, is_active: status === 'active' };
    if (status === 'archived') patch.archived_at = new Date().toISOString();
    const { error } = await supabase.from('vip_codes').update(patch).eq('id', c.id);
    if (error) return toast.error('Erro ao atualizar');
    setCodes((cs) => cs.map((x) => (x.id === c.id ? { ...x, ...patch } as VipCode : x)));
    logEvent(c.id, c.code, status === 'archived' ? 'archived' : status === 'active' ? 'activated' : 'paused');
    toast.success(`Código ${STATUS_LABEL[status].toLowerCase()}`);
  };

  const handleDelete = async (c: VipCode) => {
    if (!confirm('Excluir este código? As ativações já realizadas serão mantidas.')) return;
    const { error } = await supabase.from('vip_codes').delete().eq('id', c.id);
    if (error) return toast.error('Erro ao excluir');
    setCodes((cs) => cs.filter((x) => x.id !== c.id));
    logEvent(null, c.code, 'deleted');
    toast.success('Removido');
  };

  /* -------------------------------- derived ------------------------------- */

  const planByCode = (code: string) => plans.find((p) => p.code === code);

  const revenueFor = (c: VipCode) => {
    const plan = planByCode(c.plan_code);
    if (!plan) return 0;
    const months = Math.max(1, (c.duration_days || 30) / 30);
    return plan.price_monthly * months * c.uses_count;
  };

  const stats = useMemo(() => {
    const total = codes.length;
    const active = codes.filter((c) => effectiveStatus(c) === 'active').length;
    const expired = codes.filter((c) => effectiveStatus(c) === 'expired').length;
    const used = codes.filter((c) => c.uses_count > 0).length;
    const views = codes.reduce((s, c) => s + (c.views_count || 0), 0);
    const uses = codes.reduce((s, c) => s + (c.uses_count || 0), 0);
    const premiumDays = redemptions.reduce((s, r) => s + (r.days_granted ?? 0), 0);
    const users = new Set(redemptions.map((r) => r.user_id)).size;
    const conversion = views ? (uses / views) * 100 : 0;
    const revenue = codes.reduce((s, c) => s + revenueFor(c), 0);
    return { total, active, expired, used, views, uses, premiumDays, users, conversion, revenue };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [codes, redemptions, plans]);

  const dailyChart = useMemo(() => {
    const map = new Map<string, number>();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      map.set(d.toISOString().slice(0, 10), 0);
    }
    redemptions.forEach((r) => {
      const key = r.redeemed_at.slice(0, 10);
      if (map.has(key)) map.set(key, (map.get(key) ?? 0) + 1);
    });
    return Array.from(map.entries()).map(([date, value]) => ({
      date: new Date(`${date}T12:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
      value,
    }));
  }, [redemptions]);

  const sourceChart = useMemo(() => {
    const map = new Map<string, number>();
    codes.forEach((c) => {
      if (!c.uses_count) return;
      map.set(c.campaign_source, (map.get(c.campaign_source) ?? 0) + c.uses_count);
    });
    return Array.from(map.entries())
      .map(([src, value]) => ({ name: label(SOURCES, src), value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [codes]);

  const topCodes = useMemo(
    () => [...codes].filter((c) => c.uses_count > 0).sort((a, b) => b.uses_count - a.uses_count).slice(0, 8)
      .map((c) => ({ name: c.code, value: c.uses_count })),
    [codes],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = codes.filter((c) => {
      if (!q) return true;
      return [c.code, c.internal_name, c.campaign_label, c.campaign_source, c.status, c.code_type]
        .some((v) => (v ?? '').toString().toLowerCase().includes(q));
    });
    switch (filter) {
      case 'active': list = list.filter((c) => effectiveStatus(c) === 'active'); break;
      case 'expired': list = list.filter((c) => effectiveStatus(c) === 'expired'); break;
      case 'never_used': list = list.filter((c) => c.uses_count === 0); break;
      case 'most_used': list = [...list].sort((a, b) => b.uses_count - a.uses_count).filter((c) => c.uses_count > 0); break;
      case 'tiktok': list = list.filter((c) => c.campaign_source === 'tiktok'); break;
      case 'instagram': list = list.filter((c) => c.campaign_source === 'instagram'); break;
      case 'influencer': list = list.filter((c) => c.campaign_source === 'influencer' || c.code_type === 'influencer'); break;
    }
    return list;
  }, [codes, search, filter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const recentRedemptions = redemptions.slice(0, 8);

  /* --------------------------------- render -------------------------------- */

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-base font-semibold flex items-center gap-2"><Crown size={16} /> Códigos VIP</h2>
        <Button size="sm" onClick={openCreate}><Plus size={14} className="mr-1" /> Novo código</Button>
      </div>

      <Tabs defaultValue="dashboard">
        <TabsList>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="codes">Códigos</TabsTrigger>
        </TabsList>

        {/* ------------------------------ DASHBOARD ----------------------------- */}
        <TabsContent value="dashboard" className="space-y-4 pt-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <StatBox icon={<Crown size={14} />} label="Códigos criados" value={String(stats.total)} />
            <StatBox icon={<Play size={14} />} label="Ativos" value={String(stats.active)} />
            <StatBox icon={<Calendar size={14} />} label="Expirados" value={String(stats.expired)} />
            <StatBox icon={<MousePointerClick size={14} />} label="Ativações" value={String(stats.uses)} />
            <StatBox icon={<Gift size={14} />} label="Dias Premium distribuídos" value={String(stats.premiumDays)} />
            <StatBox icon={<Users size={14} />} label="Usuários por código" value={String(stats.users)} />
            <StatBox icon={<TrendingUp size={14} />} label="Taxa de conversão" value={stats.views ? `${stats.conversion.toFixed(1)}%` : '—'} />
            <StatBox icon={<DollarSign size={14} />} label="Receita estimada" value={currency(stats.revenue)} />
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Ativações por dia (30 dias)</CardTitle></CardHeader>
              <CardContent className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dailyChart} margin={{ left: -20, right: 8, top: 8 }}>
                    <defs>
                      <linearGradient id="vipArea" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.5} />
                        <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={4} stroke="hsl(var(--muted-foreground))" />
                    <YAxis allowDecimals={false} tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                    <RTooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} />
                    <Area type="monotone" dataKey="value" stroke="hsl(var(--primary))" fill="url(#vipArea)" strokeWidth={2} name="Ativações" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Origem dos usuários</CardTitle></CardHeader>
              <CardContent className="h-56">
                {sourceChart.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sem ativações registradas.</p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={sourceChart} margin={{ left: -20, right: 8, top: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                      <YAxis allowDecimals={false} tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                      <RTooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} />
                      <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Ativações" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Códigos mais utilizados</CardTitle></CardHeader>
              <CardContent className="h-56">
                {topCodes.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sem ativações registradas.</p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topCodes} layout="vertical" margin={{ left: 20, right: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                      <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                      <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                      <RTooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} />
                      <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} name="Ativações" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Últimos códigos utilizados</CardTitle></CardHeader>
              <CardContent className="space-y-1">
                {recentRedemptions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhuma ativação ainda.</p>
                ) : recentRedemptions.map((r) => {
                  const c = codes.find((x) => x.id === r.vip_code_id);
                  return (
                    <div key={r.id} className="flex items-center justify-between text-xs bg-secondary/40 rounded-md px-2 py-1.5">
                      <div className="min-w-0">
                        <p className="font-mono font-medium truncate">{c?.code ?? '—'}</p>
                        <p className="text-muted-foreground truncate">{r.profile?.name ?? r.user_id.slice(0, 8)}</p>
                      </div>
                      <div className="text-right shrink-0 ml-2 font-mono">
                        {new Date(r.redeemed_at).toLocaleDateString('pt-BR')}
                        {r.days_granted ? <span className="text-muted-foreground"> · {r.days_granted}d</span> : null}
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* -------------------------------- CODES ------------------------------- */}
        <TabsContent value="codes" className="space-y-3 pt-4">
          <div className="flex flex-col md:flex-row gap-2">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-8"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Pesquisar por código, nome, campanha, origem ou status"
              />
            </div>
          </div>

          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className={cn(
                  'shrink-0 px-3 py-1.5 rounded-full text-xs border transition-colors',
                  filter === f.value ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-muted-foreground hover:bg-secondary',
                )}
              >
                {f.label}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="animate-spin" size={14} /> Carregando…</div>
          ) : paged.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum código encontrado.</p>
          ) : (
            <div className="space-y-2">
              {paged.map((c) => {
                const plan = planByCode(c.plan_code);
                const conv = c.views_count > 0 ? (c.uses_count / c.views_count) * 100 : 0;
                const codeReds = redemptions.filter((r) => r.vip_code_id === c.id);
                const isOpen = expanded === c.id;
                const st = effectiveStatus(c);
                const remaining = c.unlimited || c.max_uses == null ? '∞' : Math.max(0, c.max_uses - c.uses_count);
                return (
                  <div key={c.id} className="border rounded-lg p-3 space-y-2">
                    <div className="flex flex-col md:flex-row md:items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-semibold">{c.code}</span>
                          <Badge variant={st === 'active' ? 'default' : st === 'expired' ? 'destructive' : 'secondary'}>{STATUS_LABEL[st]}</Badge>
                          <Badge variant="outline">{label(CODE_TYPES, c.code_type)}</Badge>
                          <Badge variant="outline">{label(SOURCES, c.campaign_source)}</Badge>
                          <Badge variant="outline">{plan?.name ?? c.plan_code}</Badge>
                          <Badge variant="outline">
                            {c.benefit_type === 'lifetime' ? 'Vitalício'
                              : c.benefit_type === 'percent_discount' ? `${c.discount_percent}%`
                              : c.benefit_type === 'fixed_discount' ? currency(c.discount_amount ?? 0)
                              : `${c.duration_days}d`}
                          </Badge>
                        </div>
                        {c.internal_name && <p className="text-sm font-medium mt-1 truncate">{c.internal_name}</p>}
                        <div className="text-xs text-muted-foreground font-mono truncate mt-1 flex items-center gap-1">
                          <LinkIcon size={12} /> {buildLink(c.code)}
                        </div>
                        {c.campaign_label && <p className="text-xs text-muted-foreground mt-0.5">Campanha: {c.campaign_label}</p>}
                        {c.description && <p className="text-xs text-muted-foreground mt-1">{c.description}</p>}
                      </div>
                      <div className="flex items-center gap-1 shrink-0 flex-wrap">
                        <Switch checked={st === 'active'} onCheckedChange={(v) => setStatus(c, v ? 'active' : 'paused')} />
                        <Button size="sm" variant="outline" onClick={() => copy(c.code, 'Código copiado!')}><Copy size={14} /></Button>
                        <Button size="sm" variant="outline" onClick={() => copy(buildLink(c.code), 'Link copiado!')}><LinkIcon size={14} /></Button>
                        <Button size="sm" variant="outline" onClick={() => share(c)}><Share2 size={14} /></Button>
                        <Button size="sm" variant="outline" onClick={() => openDuplicate(c)}><CopyPlus size={14} /></Button>
                        <Button size="sm" variant="outline" onClick={() => setStatus(c, st === 'archived' ? 'active' : 'archived')}>
                          {st === 'archived' ? <Play size={14} /> : <Archive size={14} />}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleDelete(c)}><Trash2 size={14} className="text-destructive" /></Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-6 gap-2 pt-2 border-t border-border/50">
                      <MiniStat icon={<Eye size={12} />} label="Views" value={String(c.views_count)} />
                      <MiniStat icon={<MousePointerClick size={12} />} label="Ativações" value={`${c.uses_count}${c.max_uses ? `/${c.max_uses}` : ''}`} />
                      <MiniStat icon={<Gift size={12} />} label="Restantes" value={String(remaining)} />
                      <MiniStat icon={<TrendingUp size={12} />} label="Conversão" value={c.views_count ? `${conv.toFixed(1)}%` : '—'} />
                      <MiniStat icon={<DollarSign size={12} />} label="Receita est." value={currency(revenueFor(c))} />
                      <MiniStat
                        icon={<CalendarDays size={12} />}
                        label="Validade"
                        value={c.expires_at ? new Date(c.expires_at).toLocaleDateString('pt-BR') : 'Sem expiração'}
                      />
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
                              <div key={r.id} className="flex items-center justify-between text-xs bg-secondary/40 rounded-md px-2 py-1.5 gap-2">
                                <div className="min-w-0 flex-1">
                                  <p className="font-medium truncate">{r.profile?.name ?? '—'}</p>
                                  <p className="text-muted-foreground truncate">{r.profile?.email ?? r.user_id.slice(0, 8)}</p>
                                  <p className="text-muted-foreground truncate">
                                    {plan?.name ?? r.plan_code}
                                    {r.days_granted ? ` · ${r.days_granted} dias` : ''}
                                    {r.source_campaign ? ` · ${label(SOURCES, r.source_campaign)}` : ''}
                                    {r.device ? ` · ${r.device}` : ''}
                                  </p>
                                </div>
                                <div className="text-right shrink-0">
                                  <p className="font-mono">
                                    {new Date(r.redeemed_at).toLocaleDateString('pt-BR')} {new Date(r.redeemed_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                  </p>
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

              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-2">
                  <Button size="sm" variant="outline" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Anterior</Button>
                  <span className="text-xs text-muted-foreground">Página {page} de {totalPages} · {filtered.length} códigos</span>
                  <Button size="sm" variant="outline" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>Próxima</Button>
                </div>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* --------------------------------- MODAL -------------------------------- */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Crown size={16} /> Novo código VIP</DialogTitle></DialogHeader>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <Label>Nome interno</Label>
              <Input value={form.internal_name} onChange={(e) => setForm({ ...form, internal_name: e.target.value })} placeholder="Campanha TikTok Janeiro" />
            </div>
            <div className="space-y-1">
              <Label>Código</Label>
              <div className="flex gap-2">
                <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="EX: TIKTOK180" className="font-mono" />
                <Button type="button" variant="outline" onClick={() => setForm({ ...form, code: randomCode() })}><Wand2 size={14} /></Button>
              </div>
            </div>

            <div className="space-y-1">
              <Label>Tipo</Label>
              <Select value={form.code_type} onValueChange={(v) => setForm({ ...form, code_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CODE_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Plano</Label>
              <Select value={form.plan_code} onValueChange={(v) => setForm({ ...form, plan_code: v })}>
                <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                <SelectContent>{plans.map((p) => <SelectItem key={p.code} value={p.code}>{p.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Benefício</Label>
              <Select value={form.benefit_type} onValueChange={(v) => setForm({ ...form, benefit_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{BENEFITS.map((b) => <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            {form.benefit_type === 'days' && (
              <div className="space-y-1">
                <Label>Dias Premium</Label>
                <div className="flex gap-2">
                  <Input type="number" min={1} value={form.duration_days} onChange={(e) => setForm({ ...form, duration_days: Number(e.target.value) })} />
                </div>
                <div className="flex gap-1 pt-1">
                  {DAY_PRESETS.map((d) => (
                    <button key={d} type="button" onClick={() => setForm({ ...form, duration_days: d })}
                      className={cn('px-2 py-1 rounded-md text-xs border', form.duration_days === d ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-muted-foreground')}>
                      {d}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {form.benefit_type === 'percent_discount' && (
              <div className="space-y-1">
                <Label>Desconto (%)</Label>
                <Input type="number" min={1} max={100} value={form.discount_percent} onChange={(e) => setForm({ ...form, discount_percent: e.target.value })} />
              </div>
            )}
            {form.benefit_type === 'fixed_discount' && (
              <div className="space-y-1">
                <Label>Desconto (R$)</Label>
                <Input type="number" min={1} value={form.discount_amount} onChange={(e) => setForm({ ...form, discount_amount: e.target.value })} />
              </div>
            )}

            <div className="space-y-1">
              <Label>Origem da campanha</Label>
              <Select value={form.campaign_source} onValueChange={(v) => setForm({ ...form, campaign_source: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{SOURCES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Identificação da campanha (opcional)</Label>
              <Input value={form.campaign_label} onChange={(e) => setForm({ ...form, campaign_label: e.target.value })} placeholder="@influenciador / nome do parceiro" />
            </div>

            <div className="space-y-1">
              <Label>Início (opcional)</Label>
              <Input type="datetime-local" value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Expira em</Label>
              <Input type="datetime-local" disabled={form.no_expiration} value={form.expires_at} onChange={(e) => setForm({ ...form, expires_at: e.target.value })} />
              <div className="flex items-center gap-2 pt-1">
                <Switch checked={form.no_expiration} onCheckedChange={(v) => setForm({ ...form, no_expiration: v })} />
                <span className="text-xs text-muted-foreground">Sem expiração</span>
              </div>
            </div>

            <div className="space-y-1">
              <Label>Máximo de ativações</Label>
              <Input type="number" min={1} disabled={form.unlimited} value={form.max_uses} onChange={(e) => setForm({ ...form, max_uses: e.target.value })} placeholder="Ilimitado" />
              <div className="flex items-center gap-2 pt-1">
                <Switch checked={form.unlimited} onCheckedChange={(v) => setForm({ ...form, unlimited: v })} />
                <span className="text-xs text-muted-foreground">Ativações ilimitadas</span>
              </div>
            </div>
            <div className="space-y-1">
              <Label>Regras</Label>
              <div className="flex items-center gap-2 h-10">
                <Switch checked={form.single_use_per_user} onCheckedChange={(v) => setForm({ ...form, single_use_per_user: v })} />
                <span className="text-xs text-muted-foreground">Ativação única por usuário</span>
              </div>
            </div>

            <div className="space-y-1">
              <Label>Status inicial</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Ativo</SelectItem>
                  <SelectItem value="paused">Pausado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1 md:col-span-2">
              <Label>Descrição (opcional)</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
            </div>

            <div className="md:col-span-2 flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
              <Button onClick={handleCreate} disabled={saving}>
                {saving ? <Loader2 className="animate-spin mr-2" size={14} /> : <Plus className="mr-2" size={14} />}
                Criar código
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
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
      <p className="font-mono font-medium mt-0.5 truncate">{value}</p>
    </div>
  );
}
