import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CreditCard, Crown, Check, Lock, Sparkles, Calendar, Clock, ArrowRight, ShieldCheck, X, Receipt,
} from 'lucide-react';
import { SettingsSubPageHeader } from '@/components/settings/SettingsSubPageHeader';
import { VipRedeemInput } from '@/components/VipRedeemInput';
import { CouponInput } from '@/components/subscription/CouponInput';
import { SubscriptionLogs } from '@/components/subscription/SubscriptionLogs';
import { TrialBanner } from '@/components/subscription/TrialBanner';
import { useSubscription } from '@/hooks/useSubscription';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { formatBRL } from '@/lib/currency';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface PaymentRow {
  id: string;
  plan_code: string | null;
  amount: number;
  currency: string;
  status: string;
  payment_method: string | null;
  paid_at: string | null;
  created_at: string;
}

function formatDatePtBR(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return iso;
  }
}

function daysUntil(iso: string) {
  const diff = new Date(iso).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

export default function SubscriptionSettings() {
  const { user } = useAuth();
  const { plans, subscription, currentPlanCode, loading, selectPlan, reload } = useSubscription(user?.id);
  const navigate = useNavigate();
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [payments, setPayments] = useState<PaymentRow[]>([]);

  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from('payments')
      .select('id, plan_code, amount, currency, status, payment_method, paid_at, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20)
      .then(({ data }) => setPayments((data as PaymentRow[]) ?? []));
  }, [user?.id]);

  const currentPlan = plans.find(p => p.code === currentPlanCode);
  const isPaid = currentPlanCode !== 'free';
  const premiumPlan = useMemo(
    () => plans.find(p => p.code !== 'free' && p.price_monthly > 0) ?? plans.find(p => p.code !== 'free'),
    [plans],
  );
  const featuresToShow = currentPlan?.features?.length ? currentPlan.features : premiumPlan?.features ?? [];

  const status = subscription?.status ?? (isPaid ? 'active' : 'free');
  const statusLabel = isPaid
    ? status === 'active' ? 'Plano ativo' : status === 'cancelled' ? 'Cancelado' : 'Em análise'
    : 'Plano gratuito';

  const price = currentPlan?.price_monthly ?? 0;
  const expiresAt = subscription?.expires_at ?? null;
  const daysLeft = expiresAt ? daysUntil(expiresAt) : null;

  const handleCancel = async () => {
    if (!user) return;
    setCancelling(true);
    try {
      const { data, error } = await supabase.functions.invoke('cancel-subscription', { body: {} });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast.success('Assinatura cancelada', { description: 'Você voltou ao plano gratuito.' });
      setConfirmingCancel(false);
      await reload();
    } catch (e: any) {
      toast.error(e?.message ?? 'Não foi possível cancelar agora.');
    } finally {
      setCancelling(false);
    }
  };

  const statusColor = (s: string) =>
    s === 'approved' ? 'bg-success/15 text-success'
    : s === 'pending' || s === 'in_process' ? 'bg-warning/15 text-warning'
    : s === 'rejected' || s === 'cancelled' ? 'bg-destructive/15 text-destructive'
    : 'bg-muted text-muted-foreground';
  const statusLabelBr = (s: string) =>
    ({ approved: 'Aprovado', pending: 'Pendente', in_process: 'Em análise', rejected: 'Recusado', cancelled: 'Cancelado', refunded: 'Estornado' } as Record<string, string>)[s] ?? s;

  return (
    <div className="min-h-screen bg-background pb-24">
      <SettingsSubPageHeader
        title="Assinatura"
        description="Gerencie seu plano Finango."
        icon={<CreditCard size={22} />}
      />

      <main className="px-4 space-y-5 max-w-3xl mx-auto">
        {/* Header card */}
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className={cn(
            'relative overflow-hidden rounded-2xl p-5 border',
            isPaid
              ? 'border-primary/30 bg-gradient-to-br from-primary/15 via-primary/5 to-accent/10'
              : 'border-border/60 bg-secondary/40',
          )}
        >
          {isPaid && (
            <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-primary/15 blur-3xl pointer-events-none" />
          )}
          <div className="relative flex items-start justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={cn(
                  'w-12 h-12 rounded-2xl flex items-center justify-center shrink-0',
                  isPaid ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground',
                )}
              >
                {isPaid ? <Crown size={24} className="fill-primary/30" /> : <Sparkles size={22} />}
              </div>
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
                  Seu plano
                </p>
                <h2 className="text-xl font-bold truncate">
                  {loading ? 'Carregando…' : currentPlan?.name ?? 'Finango Free'}
                </h2>
                <span
                  className={cn(
                    'inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full mt-1',
                    isPaid
                      ? 'bg-success/15 text-success'
                      : 'bg-muted text-muted-foreground',
                  )}
                >
                  <span className={cn('w-1.5 h-1.5 rounded-full', isPaid ? 'bg-success' : 'bg-muted-foreground')} />
                  {statusLabel}
                </span>
              </div>
            </div>
            {isPaid && price > 0 && (
              <div className="text-right shrink-0">
                <p className="text-lg font-bold">{formatBRL(price)}</p>
                <p className="text-[11px] text-muted-foreground">por mês</p>
              </div>
            )}
          </div>

          {isPaid && expiresAt && (
            <div className="relative mt-4 grid grid-cols-2 gap-2">
              <div className="rounded-xl bg-background/60 border border-border/40 p-3">
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <Calendar size={12} /> Renova em
                </div>
                <p className="font-semibold text-sm mt-0.5">{formatDatePtBR(expiresAt)}</p>
              </div>
              <div className="rounded-xl bg-background/60 border border-border/40 p-3">
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <Clock size={12} /> Restam
                </div>
                <p className="font-semibold text-sm mt-0.5">
                  {daysLeft} {daysLeft === 1 ? 'dia' : 'dias'}
                </p>
              </div>
            </div>
          )}

          {!isPaid && (
            <div className="relative mt-4">
              <p className="text-sm text-muted-foreground">
                Você está utilizando o plano gratuito. Conheça os benefícios do Premium.
              </p>
              <button
                onClick={() => navigate('/plans')}
                className="mt-3 w-full py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold touch-scale hover:bg-primary/90 transition-colors flex items-center justify-center gap-1.5"
              >
                Conhecer Premium <ArrowRight size={16} />
              </button>
            </div>
          )}
        </motion.section>

        {/* Benefits */}
        {featuresToShow.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.05 }}
            className="card-finance"
          >
            <div className="flex items-center gap-2 mb-3">
              <Sparkles size={16} className="text-primary" />
              <h2 className="font-semibold">
                {isPaid ? 'Seus benefícios' : 'Benefícios do Premium'}
              </h2>
            </div>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
              {featuresToShow.map((f, i) => {
                const locked = !isPaid;
                return (
                  <li key={i} className={cn('flex items-start gap-2 text-sm', locked && 'text-muted-foreground')}>
                    <span
                      className={cn(
                        'w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5',
                        locked ? 'bg-muted' : 'bg-success/15 text-success',
                      )}
                    >
                      {locked ? <Lock size={11} /> : <Check size={12} />}
                    </span>
                    <span className={cn(!f.enabled && 'opacity-50')}>{f.label}</span>
                  </li>
                );
              })}
            </ul>
          </motion.section>
        )}

        {/* Manage subscription — only real actions */}
        {isPaid && (
          <motion.section
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.1 }}
            className="card-finance"
          >
            <h2 className="font-semibold mb-3">Gerenciar assinatura</h2>

            <AnimatePresence mode="wait" initial={false}>
              {confirmingCancel ? (
                <motion.div
                  key="confirm"
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="rounded-xl border border-destructive/30 bg-destructive/5 p-4"
                >
                  <p className="font-semibold text-sm">Tem certeza que deseja cancelar?</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Ao cancelar, você perderá o acesso a:
                  </p>
                  <ul className="mt-2 space-y-1">
                    {featuresToShow.slice(0, 5).map((f, i) => (
                      <li key={i} className="flex items-center gap-2 text-xs">
                        <X size={12} className="text-destructive" />
                        <span>{f.label}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={() => setConfirmingCancel(false)}
                      disabled={cancelling}
                      className="flex-1 py-2.5 rounded-xl bg-secondary font-medium text-sm touch-scale"
                    >
                      Voltar
                    </button>
                    <button
                      onClick={handleCancel}
                      disabled={cancelling}
                      className="flex-1 py-2.5 rounded-xl bg-destructive text-destructive-foreground font-medium text-sm touch-scale disabled:opacity-60"
                    >
                      {cancelling ? 'Cancelando…' : 'Confirmar cancelamento'}
                    </button>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="actions"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-1.5"
                >
                  <button
                    onClick={() => navigate('/plans')}
                    className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-secondary/60 touch-scale text-left"
                  >
                    <div className="w-10 h-10 rounded-xl bg-primary/15 text-primary flex items-center justify-center">
                      <Crown size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">Trocar de plano</p>
                      <p className="text-xs text-muted-foreground">Compare e escolha outro plano</p>
                    </div>
                    <ArrowRight size={16} className="text-muted-foreground" />
                  </button>

                  <button
                    onClick={() => setConfirmingCancel(true)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-destructive/10 touch-scale text-left text-destructive"
                  >
                    <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center">
                      <X size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">Cancelar assinatura</p>
                      <p className="text-xs text-destructive/70">Voltar ao plano gratuito</p>
                    </div>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.section>
        )}

        {/* Coupon */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.13 }}
        >
          <CouponInput planCode={currentPlanCode} onApplied={() => reload()} />
        </motion.div>

        {/* VIP */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.15 }}
        >
          <VipRedeemInput />
        </motion.div>

        {/* Subscription events log */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.18 }}
        >
          <SubscriptionLogs />
        </motion.div>

        {/* Payment history */}
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.2 }}
          className="card-finance"
        >
          <div className="flex items-center gap-2 mb-3">
            <Receipt size={16} className="text-primary" />
            <h2 className="font-semibold">Histórico de pagamentos</h2>
          </div>
          {payments.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum pagamento registrado ainda.</p>
          ) : (
            <ul className="divide-y divide-border/40">
              {payments.map((p) => (
                <li key={p.id} className="py-2.5 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">
                      {p.plan_code ? `Plano ${p.plan_code}` : 'Pagamento'} · {formatBRL(Number(p.amount))}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {formatDatePtBR(p.paid_at ?? p.created_at)}
                      {p.payment_method ? ` · ${p.payment_method}` : ''}
                    </p>
                  </div>
                  <span className={cn('text-[11px] font-semibold px-2 py-0.5 rounded-full', statusColor(p.status))}>
                    {statusLabelBr(p.status)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </motion.section>


        {/* Footer */}
        <div className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground pt-2">
          <ShieldCheck size={12} />
          Pagamentos seguros · Cancele quando quiser
        </div>
      </main>
    </div>
  );
}
