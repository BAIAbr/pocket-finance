import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, TrendingUp, Users, DollarSign, Crown, Ticket, Sparkles, Clock } from 'lucide-react';
import { formatBRL } from '@/lib/currency';
import { cn } from '@/lib/utils';

interface Plan {
  code: string;
  name: string;
  price_monthly: number;
  max_seats: number | null;
  seats_taken: number | null;
}

interface SubRow {
  user_id: string;
  plan_code: string;
  status: string;
  trial: boolean | null;
  amount: number | null;
  expires_at: string | null;
  created_at: string;
}

interface PaymentAgg {
  status: string;
  amount: number;
  paid_at: string | null;
  created_at: string;
}

interface CouponRow {
  code: string;
  uses_count: number;
  max_uses: number | null;
  active: boolean;
  discount_type: string;
  discount_value: number;
  free_days: number;
}

interface LogRow {
  id: string;
  event_type: string;
  plan_code: string | null;
  source: string | null;
  created_at: string;
}

function daysAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

const EVENT_LABEL: Record<string, string> = {
  subscription_created: 'Nova assinatura',
  subscription_activated: 'Ativação',
  subscription_cancelled: 'Cancelamento',
  subscription_renewed: 'Renovação',
  subscription_upgraded: 'Upgrade',
  subscription_downgraded: 'Downgrade',
  payment_approved: 'Pagamento aprovado',
  payment_rejected: 'Pagamento recusado',
  payment_pending: 'Pagamento pendente',
  coupon_applied: 'Cupom aplicado',
  vip_redeemed: 'VIP resgatado',
  webhook_received: 'Webhook MP',
  trial_started: 'Trial iniciado',
  trial_ended: 'Trial finalizado',
};

export default function SubscriptionsAdminManager() {
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [subs, setSubs] = useState<SubRow[]>([]);
  const [payments, setPayments] = useState<PaymentAgg[]>([]);
  const [coupons, setCoupons] = useState<CouponRow[]>([]);
  const [logs, setLogs] = useState<LogRow[]>([]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [p, s, py, c, l] = await Promise.all([
        supabase.from('subscription_plans').select('code, name, price_monthly, max_seats, seats_taken').order('sort_order'),
        supabase.from('user_subscriptions').select('user_id, plan_code, status, trial, amount, expires_at, created_at'),
        supabase.from('payments').select('status, amount, paid_at, created_at').order('created_at', { ascending: false }).limit(500),
        supabase.from('coupons').select('code, uses_count, max_uses, active, discount_type, discount_value, free_days').order('created_at', { ascending: false }),
        supabase.functions.invoke('subscription-logs', { body: { scope: 'all', limit: 30 } }),
      ]);
      if (p.data) setPlans(p.data as Plan[]);
      if (s.data) setSubs(s.data as SubRow[]);
      if (py.data) setPayments(py.data as PaymentAgg[]);
      if (c.data) setCoupons(c.data as CouponRow[]);
      if ((l.data as any)?.logs) setLogs((l.data as any).logs as LogRow[]);
      setLoading(false);
    })();
  }, []);

  const priceByCode = useMemo(() => {
    const m: Record<string, number> = {};
    plans.forEach(p => { m[p.code] = Number(p.price_monthly ?? 0); });
    return m;
  }, [plans]);

  const activeSubs = subs.filter(s => ['active', 'trial', 'vip'].includes(s.status) && s.plan_code !== 'free');
  const trialSubs = subs.filter(s => s.trial === true && s.status === 'trial');
  const cancelledSubs = subs.filter(s => s.status === 'cancelled');

  const mrr = activeSubs.reduce((sum, s) => sum + (Number(s.amount) || priceByCode[s.plan_code] || 0), 0);

  const approvedPayments = payments.filter(p => p.status === 'approved');
  const totalRevenue = approvedPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const last30Revenue = approvedPayments
    .filter(p => daysAgo(p.paid_at ?? p.created_at) <= 30)
    .reduce((sum, p) => sum + Number(p.amount || 0), 0);

  const planDistribution = plans.map(pl => {
    const list = subs.filter(s => s.plan_code === pl.code);
    const activeList = list.filter(s => ['active', 'trial', 'vip'].includes(s.status));
    return {
      code: pl.code,
      name: pl.name,
      price: Number(pl.price_monthly),
      total: list.length,
      active: activeList.length,
      revenue: activeList.reduce((sum, s) => sum + (Number(s.amount) || Number(pl.price_monthly) || 0), 0),
      max_seats: pl.max_seats,
      seats_taken: pl.seats_taken ?? activeList.length,
    };
  });

  const funderPlan = plans.find(p => p.code === 'funder');
  const funderTaken = funderPlan?.seats_taken ?? subs.filter(s => s.plan_code === 'funder' && s.status === 'active').length;
  const funderMax = funderPlan?.max_seats ?? 500;
  const funderPct = Math.min(100, Math.round(((funderTaken || 0) / funderMax) * 100));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <DollarSign size={14} /> MRR
            </div>
            <p className="text-2xl font-bold">{formatBRL(mrr)}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Receita recorrente/mês</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <TrendingUp size={14} /> Receita 30d
            </div>
            <p className="text-2xl font-bold">{formatBRL(last30Revenue)}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Total: {formatBRL(totalRevenue)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <Users size={14} /> Assinantes pagantes
            </div>
            <p className="text-2xl font-bold">{activeSubs.length}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {cancelledSubs.length} cancelados
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <Clock size={14} /> Em trial
            </div>
            <p className="text-2xl font-bold">{trialSubs.length}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Período gratuito ativo</p>
          </CardContent>
        </Card>
      </div>

      {/* Funder progress */}
      {funderPlan && (
        <Card className="border-primary/30 bg-gradient-to-br from-primary/10 via-card to-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Crown size={16} className="text-primary" /> Plano Fundador
              <Badge variant="outline" className="ml-auto text-[10px]">
                {funderTaken}/{funderMax} vagas
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-2.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary to-orange-400 transition-all"
                style={{ width: `${funderPct}%` }}
              />
            </div>
            <div className="flex justify-between mt-2 text-xs text-muted-foreground">
              <span>{funderPct}% ocupado</span>
              <span>{Math.max(0, funderMax - (funderTaken || 0))} vagas restantes</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Plan distribution */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Sparkles size={16} className="text-primary" /> Distribuição por plano
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {planDistribution.map(p => (
            <div key={p.code} className="flex items-center justify-between p-2.5 rounded-xl bg-secondary/40 border border-border/40">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-sm">{p.name}</p>
                  <span className="text-[10px] font-mono text-muted-foreground">{p.code}</span>
                  {p.price > 0 && (
                    <Badge variant="secondary" className="text-[10px]">{formatBRL(p.price)}/mês</Badge>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {p.active} ativos · {p.total} total
                  {p.max_seats ? ` · limite ${p.max_seats}` : ''}
                </p>
              </div>
              <div className="text-right shrink-0 ml-2">
                <p className="text-sm font-bold">{formatBRL(p.revenue)}</p>
                <p className="text-[10px] text-muted-foreground">MRR</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Coupons */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Ticket size={16} className="text-primary" /> Cupons
          </CardTitle>
        </CardHeader>
        <CardContent>
          {coupons.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum cupom cadastrado.</p>
          ) : (
            <div className="space-y-1.5">
              {coupons.map(c => (
                <div key={c.code} className="flex items-center justify-between gap-2 p-2 rounded-lg border border-border/40">
                  <div className="min-w-0">
                    <p className="font-mono text-sm font-bold">{c.code}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {c.discount_type === 'percent'
                        ? `${c.discount_value}% de desconto`
                        : c.discount_type === 'fixed'
                        ? `${formatBRL(c.discount_value)} de desconto`
                        : c.free_days > 0
                        ? `${c.free_days} dias grátis`
                        : 'Sem desconto'}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-semibold">
                      {c.uses_count}{c.max_uses ? `/${c.max_uses}` : ''} usos
                    </p>
                    <Badge variant={c.active ? 'default' : 'secondary'} className="text-[9px] mt-0.5">
                      {c.active ? 'ativo' : 'inativo'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent events */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Eventos recentes</CardTitle>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum evento registrado ainda.</p>
          ) : (
            <ul className="divide-y divide-border/40">
              {logs.map(l => (
                <li key={l.id} className="py-2 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{EVENT_LABEL[l.event_type] ?? l.event_type}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {new Date(l.created_at).toLocaleString('pt-BR', {
                        day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
                      })}
                      {l.plan_code ? ` · ${l.plan_code}` : ''}
                      {l.source ? ` · ${l.source}` : ''}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
