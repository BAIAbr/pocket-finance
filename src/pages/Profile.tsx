import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ArrowLeft, Crown, Camera, LogOut, Shield, KeyRound, Pencil,
  Calendar, Mail, ChevronRight, Sparkles, User as UserIcon, Loader2,
  Wallet, TrendingUp, Target, CreditCard, PiggyBank, ListChecks,
  CheckCircle2, Circle, Download, Trash2, X,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { usePlanAccess } from '@/hooks/usePlanAccess';
import { useSubscription } from '@/hooks/useSubscription';
import { useEffectiveFinance } from '@/hooks/useEffectiveFinance';
import { useInvestments } from '@/hooks/useInvestments';
import { useFinancialGoals } from '@/hooks/useFinancialGoals';
import { useInstallments } from '@/hooks/useInstallments';
import { useRecurring } from '@/hooks/useRecurring';
import { cn } from '@/lib/utils';
import { formatBRL as formatCurrency } from '@/lib/currency';
import foxMask from '@/assets/finango-fox-mask.png.asset.json';

function initialsOf(name: string) {
  return name.trim().split(/\s+/).map(p => p[0]).slice(0, 2).join('').toUpperCase();
}

function formatUsingTime(createdAt?: string | null) {
  if (!createdAt) return '—';
  const start = new Date(createdAt);
  const now = new Date();
  const totalDays = Math.max(0, Math.floor((now.getTime() - start.getTime()) / 86400000));
  if (totalDays < 30) return `${totalDays} ${totalDays === 1 ? 'dia' : 'dias'}`;
  let months = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
  let days = now.getDate() - start.getDate();
  if (days < 0) {
    months -= 1;
    const prev = new Date(now.getFullYear(), now.getMonth(), 0);
    days += prev.getDate();
  }
  months = Math.max(0, months);
  const mLabel = `${months} ${months === 1 ? 'mês' : 'meses'}`;
  const dLabel = days > 0 ? ` e ${days} ${days === 1 ? 'dia' : 'dias'}` : '';
  return `${mLabel}${dLabel}`;
}

function consecutiveDays(dates: string[]) {
  if (!dates.length) return 0;
  const set = new Set(dates.map(d => d.slice(0, 10)));
  let count = 0;
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  // If no entry today, start from yesterday
  if (!set.has(cursor.toISOString().slice(0, 10))) {
    cursor.setDate(cursor.getDate() - 1);
  }
  while (set.has(cursor.toISOString().slice(0, 10))) {
    count += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return count;
}

export default function Profile() {
  const navigate = useNavigate();
  const { user, profile, signOut, refreshProfile } = useAuth();
  const { planCode } = usePlanAccess();
  const { plans, subscription } = useSubscription(user?.id);
  const finance = useEffectiveFinance();
  const { portfolio, assets } = useInvestments();
  const { goals } = useFinancialGoals();
  const { purchases } = useInstallments();
  const { items: recurringItems } = useRecurring();

  const isPaid = planCode !== 'free';
  const currentPlan = plans.find(p => p.code === planCode);

  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(profile?.name ?? '');
  const [saving, setSaving] = useState(false);
  const [showConfirmLogout, setShowConfirmLogout] = useState(false);
  const [showAllCriteria, setShowAllCriteria] = useState(false);
  const [showAllMilestones, setShowAllMilestones] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setName(profile?.name ?? ''); }, [profile?.name]);

  const memberSince = useMemo(() => {
    if (!user?.created_at) return '—';
    return new Date(user.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
  }, [user?.created_at]);
  const usingTime = useMemo(() => formatUsingTime(user?.created_at), [user?.created_at]);

  const transactions = finance.transactions ?? [];
  const categories = (finance as any).categories ?? [];
  const piggyBanks = finance.piggyBanks ?? [];
  const hasIncome = transactions.some((t: any) => t.type === 'income');
  const hasExpense = transactions.some((t: any) => t.type === 'expense');
  const completedGoals = goals.filter(g => g.is_completed).length;

  const consecutive = useMemo(
    () => consecutiveDays(transactions.map((t: any) => t.date || t.created_at || '')),
    [transactions]
  );

  // ---------- Organização Financeira (0-100) ----------
  const criteria = useMemo(() => {
    const list = [
      { key: 'profile', label: 'Perfil completo (nome e foto)', done: !!profile?.name && !!profile?.avatar_url, weight: 8 },
      { key: 'cats', label: 'Categorias organizadas (5+)', done: (categories?.length ?? 0) >= 5, weight: 8 },
      { key: 'income', label: 'Primeira receita registrada', done: hasIncome, weight: 10 },
      { key: 'expense', label: 'Primeira despesa registrada', done: hasExpense, weight: 10 },
      { key: 'tx20', label: '20 movimentações registradas', done: transactions.length >= 20, weight: 8 },
      { key: 'tx100', label: '100 movimentações registradas', done: transactions.length >= 100, weight: 8 },
      { key: 'goal', label: 'Meta financeira criada', done: goals.length > 0, weight: 8 },
      { key: 'goalDone', label: 'Meta financeira concluída', done: completedGoals > 0, weight: 8 },
      { key: 'invest', label: 'Investimento registrado', done: (assets?.length ?? 0) > 0, weight: 10 },
      { key: 'recur', label: 'Conta recorrente cadastrada', done: (recurringItems?.length ?? 0) > 0, weight: 8 },
      { key: 'install', label: 'Compra parcelada acompanhada', done: (purchases?.length ?? 0) > 0, weight: 6 },
      { key: 'piggy', label: 'Reserva criada no cofrinho', done: (piggyBanks?.length ?? 0) > 0, weight: 8 },
    ];
    const total = list.reduce((s, c) => s + c.weight, 0);
    const done = list.reduce((s, c) => s + (c.done ? c.weight : 0), 0);
    return { list, score: Math.round((done / total) * 100) };
  }, [profile, categories, hasIncome, hasExpense, transactions.length, goals.length, completedGoals, assets, recurringItems, purchases, piggyBanks]);

  const organizationMessage = (score: number) => {
    if (score >= 85) return 'Excelente organização financeira. Continue assim.';
    if (score >= 60) return 'Você mantém uma boa organização financeira.';
    if (score >= 30) return 'Sua organização financeira está evoluindo.';
    return 'Comece a registrar suas movimentações para evoluir.';
  };

  // ---------- Resumo Financeiro ----------
  const totalBalance = finance.totalBalance ?? 0;
  const totalInvested = portfolio?.totalInvested ?? 0;
  const patrimony = totalBalance + (portfolio?.totalPatrimony ?? 0);
  const summary = [
    { icon: Wallet, label: 'Patrimônio registrado', value: formatCurrency(patrimony) },
    { icon: TrendingUp, label: 'Total investido', value: formatCurrency(totalInvested) },
    { icon: Target, label: 'Metas concluídas', value: `${completedGoals} de ${goals.length}` },
    { icon: TrendingUp, label: 'Investimentos ativos', value: String(assets?.length ?? 0) },
    { icon: PiggyBank, label: 'Reservas ativas', value: String(piggyBanks?.length ?? 0) },
    { icon: CreditCard, label: 'Parcelamentos ativos', value: String(purchases?.length ?? 0) },
    { icon: ListChecks, label: 'Transações registradas', value: String(transactions.length) },
    { icon: ListChecks, label: 'Recorrentes ativos', value: String(recurringItems?.length ?? 0) },
  ];

  // ---------- Marcos ----------
  const milestones = [
    { label: 'Primeira meta criada', done: goals.length > 0 },
    { label: 'Primeira meta concluída', done: completedGoals > 0 },
    { label: 'Primeiro investimento', done: (assets?.length ?? 0) > 0 },
    { label: 'Primeira compra parcelada', done: (purchases?.length ?? 0) > 0 },
    { label: 'Primeiro cofrinho criado', done: (piggyBanks?.length ?? 0) > 0 },
    { label: 'Primeira recorrência ativa', done: (recurringItems?.length ?? 0) > 0 },
    { label: '100 transações registradas', done: transactions.length >= 100 },
    { label: '10 categorias organizadas', done: (categories?.length ?? 0) >= 10 },
  ];

  // ---------- Actions ----------
  const openFile = () => fileRef.current?.click();

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (!/^image\/(png|jpe?g|webp)$/i.test(file.type)) return toast.error('Use PNG, JPG ou WEBP');
    if (file.size > 5 * 1024 * 1024) return toast.error('Máximo 5MB');
    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `${user.id}/avatar-${Date.now()}.${ext}`;
      try {
        const { data: files } = await supabase.storage.from('avatars').list(user.id);
        if (files?.length) await supabase.storage.from('avatars').remove(files.map(f => `${user.id}/${f.name}`));
      } catch { /* ignore */ }
      const { error: upErr } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from('avatars').getPublicUrl(path);
      const { error: updErr } = await supabase.from('profiles').update({ avatar_url: `${data.publicUrl}?t=${Date.now()}` }).eq('user_id', user.id);
      if (updErr) throw updErr;
      await refreshProfile();
      toast.success('Foto atualizada');
    } catch (err: any) {
      toast.error(err.message ?? 'Erro ao enviar foto');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleRemoveAvatar = async () => {
    if (!user) return;
    setRemoving(true);
    try {
      try {
        const { data: files } = await supabase.storage.from('avatars').list(user.id);
        if (files?.length) await supabase.storage.from('avatars').remove(files.map(f => `${user.id}/${f.name}`));
      } catch { /* ignore */ }
      await supabase.from('profiles').update({ avatar_url: null }).eq('user_id', user.id);
      await refreshProfile();
      toast.success('Foto removida');
    } catch (err: any) {
      toast.error(err.message ?? 'Erro ao remover foto');
    } finally {
      setRemoving(false);
    }
  };

  const saveName = async () => {
    if (!user || !name.trim()) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('profiles').update({ name: name.trim() }).eq('user_id', user.id);
      if (error) throw error;
      await refreshProfile();
      toast.success('Perfil atualizado');
      setEditing(false);
    } catch (e: any) {
      toast.error(e.message ?? 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async () => {
    if (!user?.email) return;
    const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) toast.error(error.message);
    else toast.success('Enviamos um e-mail para redefinir sua senha');
  };

  const exportData = () => {
    try {
      const payload = {
        exportedAt: new Date().toISOString(),
        profile: { name: profile?.name, email: profile?.email },
        transactions,
        categories,
        goals,
        recurring: recurringItems,
        installments: purchases,
        piggyBanks,
        investments: { assets },
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `finango-dados-${new Date().toISOString().slice(0,10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Exportação concluída');
    } catch {
      toast.error('Não foi possível exportar');
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/auth');
  };

  const displayName = profile?.name || user?.email?.split('@')[0] || 'Usuário';
  const initials = initialsOf(displayName) || 'U';
  const score = criteria.score;

  return (
    <div className="min-h-screen bg-background pb-24 lg:pb-8">
      <div className="max-w-3xl mx-auto px-4 lg:px-8 pt-6">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4"
          aria-label="Voltar"
        >
          <ArrowLeft size={16} /> Voltar
        </button>

        <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-primary mb-3">Perfil</p>
        {/* ================ HEADER ================ */}
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className={cn(
            'relative overflow-hidden rounded-3xl p-6 mb-4 border',
            isPaid
              ? 'border-primary/30 bg-card'
              : 'border-border bg-card'
          )}
          aria-label="Cabeçalho do perfil"
        >
          <div
            aria-hidden
            className="absolute -right-8 -bottom-8 w-44 h-44 opacity-[0.08] pointer-events-none"
            style={{
              backgroundColor: 'hsl(var(--primary))',
              WebkitMaskImage: `url(${foxMask.url})`,
              maskImage: `url(${foxMask.url})`,
              WebkitMaskRepeat: 'no-repeat',
              maskRepeat: 'no-repeat',
              WebkitMaskSize: 'contain',
              maskSize: 'contain',
            }}
          />

          <div className="relative flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-5 text-center sm:text-left">
            <div className="relative shrink-0">
              {/* Moldura Fox: anel grafite + detalhe laranja */}
              <div className="rounded-full p-[3px] bg-[conic-gradient(from_210deg,hsl(var(--primary))_0deg,hsl(var(--primary)/0.15)_90deg,hsl(var(--border))_180deg,hsl(var(--primary)/0.15)_270deg,hsl(var(--primary))_360deg)]">
                <div className="rounded-full p-[3px] bg-background">
                  {profile?.avatar_url ? (
                    <img src={profile.avatar_url} alt="" className="w-24 h-24 rounded-full object-cover" />
                  ) : (
                    <div className="w-24 h-24 rounded-full bg-secondary text-primary flex items-center justify-center font-semibold text-3xl">
                      {initials}
                    </div>
                  )}
                </div>
              </div>
              <button
                onClick={openFile}
                disabled={uploading}
                aria-label="Alterar foto"
                className={cn(
                  'absolute -bottom-1 -right-1 w-9 h-9 rounded-full bg-primary text-primary-foreground',
                  'flex items-center justify-center ring-2 ring-background touch-scale shadow-md',
                  uploading && 'opacity-70 pointer-events-none'
                )}
              >
                {uploading ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
              </button>
              <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleAvatarUpload} />
            </div>

            <div className="flex-1 min-w-0 w-full">
              {editing ? (
                <div className="flex flex-col gap-2 items-stretch">
                  <label htmlFor="profile-name" className="sr-only">Nome</label>
                  <input
                    id="profile-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-background/70 border border-border text-sm"
                    autoFocus
                    maxLength={60}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={saveName}
                      disabled={saving || !name.trim()}
                      className="px-3 py-2 text-sm rounded-lg bg-primary text-primary-foreground font-semibold disabled:opacity-60"
                    >
                      {saving ? <Loader2 size={14} className="animate-spin" /> : 'Salvar'}
                    </button>
                    <button
                      onClick={() => { setEditing(false); setName(profile?.name ?? ''); }}
                      className="px-3 py-2 text-sm rounded-lg bg-secondary"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <h1 className="text-xl sm:text-2xl font-bold truncate">{displayName}</h1>
                  <p className="text-sm text-muted-foreground flex items-center justify-center sm:justify-start gap-1.5 mt-0.5 truncate">
                    <Mail size={12} /> {user?.email}
                  </p>

                  <div className="mt-3 flex flex-wrap items-center justify-center sm:justify-start gap-2">
                    <span className={cn(
                      'inline-flex items-center gap-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.12em] px-3 py-1.5 rounded-md border',
                      isPaid ? 'bg-primary/10 text-primary border-primary/40' : 'bg-secondary text-foreground border-border'
                    )}>
                      {isPaid ? <Crown size={12} /> : <Sparkles size={12} className="text-primary" />}
                      {isPaid ? (currentPlan?.name?.toUpperCase().startsWith('FINANGO') ? currentPlan.name : `Finango ${currentPlan?.name ?? 'Premium'}`) : 'Finango Free'}
                    </span>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2 justify-center sm:justify-start">
                    <button
                      onClick={() => setEditing(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold touch-scale"
                    >
                      <Pencil size={14} /> Editar Perfil
                    </button>
                    {profile?.avatar_url && (
                      <button
                        onClick={handleRemoveAvatar}
                        disabled={removing}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-background/70 border border-border text-sm text-foreground touch-scale"
                      >
                        <X size={14} /> Remover foto
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </motion.section>

        {/* ================ PLANO ================ */}
        <div className={cn('rounded-2xl border p-4 mb-6 flex items-center gap-3', isPaid ? 'border-primary/30 bg-primary/5' : 'border-border bg-card')}>
          <div className="w-10 h-10 rounded-xl bg-primary/15 text-primary flex items-center justify-center shrink-0">
            {isPaid ? <Crown size={20} /> : <Sparkles size={20} />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground">Plano atual</p>
            <p className="font-semibold text-sm truncate">{isPaid ? (currentPlan?.name ?? 'Premium') : 'Finango Free'}</p>
            <p className="text-xs text-muted-foreground truncate">
              {isPaid
                ? subscription?.started_at ? `Ativo desde ${new Date(subscription.started_at).toLocaleDateString('pt-BR')}` : 'Benefícios ativos'
                : 'Conheça os recursos exclusivos do Premium.'}
            </p>
          </div>
          <button onClick={() => navigate('/settings/subscription')} className="px-3 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold touch-scale shrink-0">
            Gerenciar
          </button>
        </div>

        {/* ================ PERFIL COMPLETO ================ */}
        <div className="rounded-2xl border border-border bg-card p-5 mb-6">
          <div className="flex items-baseline justify-between gap-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground">Perfil completo</p>
            <p className="font-mono text-2xl font-semibold text-primary tabular-nums">{score}%</p>
          </div>
          <div className="mt-3 h-1.5 rounded-full bg-secondary overflow-hidden" role="progressbar" aria-valuenow={score} aria-valuemin={0} aria-valuemax={100}>
            <motion.div className="h-full bg-primary" initial={{ width: 0 }} animate={{ width: `${score}%` }} transition={{ duration: 0.6, ease: 'easeOut' }} />
          </div>
          <p className="text-xs text-muted-foreground mt-3">{organizationMessage(score)}</p>
          {(() => {
            const pending = criteria.list.filter(c => !c.done);
            const shown = showAllCriteria ? criteria.list : pending.slice(0, 3);
            return (
              <>
                {shown.length > 0 && (
                  <ul className="mt-4 space-y-2">
                    {shown.map(c => (
                      <li key={c.key} className="flex items-center gap-2 text-sm">
                        {c.done ? <CheckCircle2 size={15} className="text-primary shrink-0" /> : <Circle size={15} className="text-muted-foreground/50 shrink-0" />}
                        <span className={cn('truncate', c.done ? 'text-foreground' : 'text-muted-foreground')}>{c.label}</span>
                      </li>
                    ))}
                  </ul>
                )}
                <button onClick={() => setShowAllCriteria(v => !v)} className="mt-3 text-xs text-primary font-medium inline-flex items-center gap-1">
                  {showAllCriteria ? 'Mostrar menos' : `${pending.length} ${pending.length === 1 ? 'pendência' : 'pendências'} · Ver detalhes`} <ChevronRight size={12} />
                </button>
              </>
            );
          })()}
        </div>

        {/* ================ RESUMO FINANCEIRO ================ */}
        <SectionTitle>Resumo financeiro</SectionTitle>
        <div className="rounded-2xl border border-border bg-card p-4 mb-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
          {summary.map(s => (
            <div key={s.label} className="min-w-0">
              <p className="text-[11px] text-muted-foreground truncate flex items-center gap-1.5"><s.icon size={12} /> {s.label}</p>
              <p className="font-mono text-sm font-medium mt-1 truncate tabular-nums">{s.value}</p>
            </div>
          ))}
        </div>

        {/* ================ CONQUISTAS ================ */}
        <div className="flex items-center justify-between px-1 mb-2 mt-1">
          <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Conquistas</h2>
          <span className="font-mono text-[11px] text-muted-foreground">{milestones.filter(m => m.done).length}/{milestones.length} desbloqueadas</span>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4 mb-6">
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {(showAllMilestones ? milestones : [...milestones].sort((a, b) => Number(b.done) - Number(a.done)).slice(0, 4)).map(m => (
              <li key={m.label} className={cn('flex items-center gap-2 text-sm p-2 rounded-lg', m.done ? 'bg-primary/5' : 'opacity-70')}>
                {m.done ? <CheckCircle2 size={15} className="text-primary shrink-0" /> : <Circle size={15} className="text-muted-foreground/50 shrink-0" />}
                <span className={cn('truncate', m.done ? 'text-foreground' : 'text-muted-foreground')}>{m.label}</span>
              </li>
            ))}
          </ul>
          {milestones.length > 4 && (
            <button onClick={() => setShowAllMilestones(v => !v)} className="mt-3 text-xs text-primary font-medium inline-flex items-center gap-1">
              {showAllMilestones ? 'Mostrar menos' : 'Ver todas'} <ChevronRight size={12} />
            </button>
          )}
        </div>

        {/* ================ OBJETIVOS ================ */}
        {(() => {
          const objs = (piggyBanks as any[]).filter(p => Number(p.target_amount) > 0).slice(0, 3);
          if (objs.length === 0) return null;
          return (
            <>
              <div className="flex items-center justify-between px-1 mb-2 mt-1">
                <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Objetivos</h2>
                <button onClick={() => navigate('/savings')} className="text-xs text-primary font-medium inline-flex items-center gap-1">Ver todos <ChevronRight size={12} /></button>
              </div>
              <div className="rounded-2xl border border-border bg-card p-4 mb-6 space-y-3">
                {objs.map(p => {
                  const pct = Math.min(100, Math.round((Number(p.balance || 0) / Number(p.target_amount)) * 100));
                  return (
                    <div key={p.id}>
                      <div className="flex items-center justify-between gap-2 text-sm">
                        <span className="truncate">{p.name}</span>
                        <span className="font-mono text-xs text-muted-foreground tabular-nums shrink-0">{pct}%</span>
                      </div>
                      <div className="mt-1.5 h-1 rounded-full bg-secondary overflow-hidden"><div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} /></div>
                    </div>
                  );
                })}
              </div>
            </>
          );
        })()}

        {/* ================ CONTA ================ */}
        <SectionTitle>Conta</SectionTitle>
        <div className="rounded-2xl border border-border bg-card p-4 mb-6 grid grid-cols-2 gap-4">
          <div className="min-w-0"><p className="text-[11px] text-muted-foreground">Membro desde</p><p className="text-sm font-medium mt-1 truncate">{memberSince}</p></div>
          <div className="min-w-0"><p className="text-[11px] text-muted-foreground">Usando o Finango há</p><p className="text-sm font-medium mt-1 truncate">{usingTime}</p></div>
          <div className="min-w-0 col-span-2 pt-3 border-t border-border/50 flex items-center justify-between gap-2">
            <p className="text-[11px] text-muted-foreground">Dias consecutivos registrando</p>
            <p className="font-mono text-sm font-semibold text-primary tabular-nums">{consecutive}</p>
          </div>
        </div>

        {/* ================ SEGURANÇA ================ */}
        <SectionTitle>Segurança</SectionTitle>
        <Section>
          <Row icon={KeyRound} label="Alterar senha" description="Enviaremos um link ao seu e-mail" onClick={changePassword} />
          <Row icon={Shield} label="Sessões e dispositivos" description="Último acesso e sessões conectadas" onClick={() => navigate('/security')} />
        </Section>

        {/* ================ PRIVACIDADE ================ */}
        <SectionTitle>Privacidade</SectionTitle>
        <Section>
          <Row icon={Download} label="Exportar dados" description="Baixe uma cópia em JSON" onClick={exportData} />
          <Row icon={UserIcon} label="Configurações do app" description="Preferências, tema, notificações" onClick={() => navigate('/settings')} />
        </Section>

        {/* ================ SAIR ================ */}
        <div className="mt-4">
          {showConfirmLogout ? (
            <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4">
              <div className="text-center mb-3">
                <div className="w-11 h-11 mx-auto mb-2 rounded-full bg-destructive/10 flex items-center justify-center">
                  <LogOut size={20} className="text-destructive" />
                </div>
                <p className="font-semibold text-sm">Tem certeza que deseja sair?</p>
                <p className="text-xs text-muted-foreground">Você precisará entrar novamente.</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShowConfirmLogout(false)} className="flex-1 py-2.5 rounded-lg bg-secondary text-sm font-medium touch-scale">
                  Cancelar
                </button>
                <button onClick={handleLogout} className="flex-1 py-2.5 rounded-lg bg-destructive text-destructive-foreground text-sm font-medium touch-scale">
                  Sair
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowConfirmLogout(true)}
              className="w-full rounded-2xl p-4 border border-destructive/30 bg-destructive/5 hover:bg-destructive/10 text-destructive font-semibold text-sm flex items-center justify-center gap-2 touch-scale"
            >
              <LogOut size={16} /> Sair da conta
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-1 mb-2 mt-1">
      {children}
    </h2>
  );
}

function Section({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden divide-y divide-border mb-4">
      {children}
    </div>
  );
}

function InfoCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-muted-foreground mb-1">
        {icon}
        <span className="text-[11px] uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-sm font-semibold">{value}</p>
    </div>
  );
}

function Row({ icon: Icon, label, description, onClick, danger }: {
  icon: any; label: string; description?: string; onClick: () => void; danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-3 min-h-[56px] px-4 py-3 hover:bg-secondary/50 transition-colors text-left',
        danger && 'text-destructive'
      )}
    >
      <div className={cn(
        'w-9 h-9 rounded-lg flex items-center justify-center shrink-0',
        danger ? 'bg-destructive/10 text-destructive' : 'bg-secondary text-foreground'
      )}>
        <Icon size={18} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{label}</p>
        {description && <p className="text-xs text-muted-foreground truncate">{description}</p>}
      </div>
      <ChevronRight size={16} className="text-muted-foreground/60 shrink-0" />
    </button>
  );
}
