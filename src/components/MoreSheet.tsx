import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  X, TrendingUp, Bot, Camera, ArrowDownUp, BarChart3,
  Crown, Settings as SettingsIcon, User, HelpCircle, Sparkles, ChevronRight, Lock,
  Search, Bell, CalendarDays, CreditCard,
} from 'lucide-react';
import { NotificationCenter } from '@/components/NotificationCenter';
import { useNotifications } from '@/hooks/useNotifications';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { usePlanAccess } from '@/hooks/usePlanAccess';
import { useAuth } from '@/contexts/AuthContext';
import foxLogo from '@/assets/finango-fox.png.asset.json';

interface MoreSheetProps {
  open: boolean;
  onClose: () => void;
}

type Item = {
  icon: any;
  label: string;
  description?: string;
  premium?: boolean;
  badge?: string;
  action: () => void;
};

type Section = { title: string; items: Item[] };

function haptic() {
  try { (navigator as any)?.vibrate?.(8); } catch { /* noop */ }
}

export function MoreSheet({ open, onClose }: MoreSheetProps) {
  const navigate = useNavigate();
  const { planCode } = usePlanAccess();
  const { profile, user } = useAuth();
  const isPaid = planCode !== 'free';

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  const go = (path: string) => () => { haptic(); onClose(); navigate(path); };
  const soon = (label: string) => () => {
    haptic();
    toast.info(`${label} em breve`, { description: 'Estamos preparando este módulo.' });
  };
  const goPremiumOr = (path: string) => () => {
    haptic();
    onClose();
    navigate(isPaid ? path : '/plans');
  };
  const premiumSoon = (label: string) => () => {
    haptic();
    if (!isPaid) { onClose(); navigate('/plans'); return; }
    toast.info(`${label} em breve`, { description: 'Estamos preparando este módulo.' });
  };

  const sections: Section[] = useMemo(() => [
    {
      title: 'Inteligência',
      items: [
        { icon: Bot, label: 'Finango IA', description: 'Copiloto financeiro inteligente', premium: true, action: goPremiumOr('/ai-insights') },
        { icon: Camera, label: 'Scanner Inteligente', description: 'Leia notas fiscais com a câmera', premium: true, action: premiumSoon('Scanner Inteligente') },
        { icon: BarChart3, label: 'Relatórios', description: 'Análises detalhadas por período', premium: true, action: goPremiumOr('/reports') },
      ],
    },
    {
      title: 'Finanças',
      items: [
        { icon: CalendarDays, label: 'Calendário Financeiro', description: 'Contas, prazos e movimentações por dia', badge: 'Novo', action: go('/calendar') },
        { icon: TrendingUp, label: 'Investimentos', description: 'Acompanhe rendimentos e carteira', badge: 'Novo', action: go('/investments') },
        { icon: CreditCard, label: 'Cartões de crédito', description: 'Limites, faturas e parcelas', badge: 'Novo', action: go('/cards') },
        { icon: ArrowDownUp, label: 'Importar e Exportar', description: 'CSV, OFX, Excel, PDF e backup', action: go('/settings/data') },
      ],
    },
    {
      title: 'Conta',
      items: [
        { icon: User, label: 'Perfil', description: 'Sua conta e preferências', action: go('/profile') },
        { icon: SettingsIcon, label: 'Configurações', description: 'Ajustes do aplicativo', action: go('/settings') },
        { icon: HelpCircle, label: 'Ajuda', description: 'Fale com o suporte', action: () => { haptic(); onClose(); window.location.href = 'mailto:suporte@finango.online'; } },
      ],
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [isPaid]);

  const displayName = profile?.name || user?.email?.split('@')[0] || 'Usuário';
  const email = profile?.email || user?.email || '';
  const initials = displayName.trim().split(/\s+/).map(p => p[0]).slice(0, 2).join('').toUpperCase();

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            aria-hidden="true"
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Mais opções"
            className="fixed inset-x-0 bottom-0 z-50 bg-card rounded-t-3xl shadow-2xl max-h-[90vh] flex flex-col safe-bottom border-t border-border/40"
            initial={{ y: '100%', opacity: 0.9 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0.8 }}
            transition={{ type: 'spring', damping: 34, stiffness: 340 }}
          >
            {/* Handle */}
            <div className="flex flex-col items-center pt-3 pb-1 shrink-0">
              <div className="w-10 h-1.5 rounded-full bg-muted-foreground/30" />
            </div>

            {/* Header title bar */}
            <div className="flex items-center justify-between px-5 pt-2 pb-3 shrink-0">
              <h2 className="text-lg font-semibold">Mais opções</h2>
              <button
                onClick={onClose}
                className="w-11 h-11 -mr-2 rounded-full hover:bg-secondary flex items-center justify-center touch-scale"
                aria-label="Fechar"
              >
                <X size={20} />
              </button>
            </div>

            {/* Scroll area */}
            <div className="overflow-y-auto px-4 pb-6">
              {/* Profile Header Card */}
              <motion.button
                onClick={go('/profile')}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
                className={cn(
                  'w-full text-left rounded-2xl p-4 mb-3 flex items-center gap-3 touch-scale',
                  'bg-gradient-to-br from-secondary/60 via-secondary/30 to-secondary/60',
                  'border border-border/50 hover:border-border transition-colors'
                )}
                aria-label="Editar perfil"
              >
                <div className="relative shrink-0">
                  {profile?.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt=""
                      className="w-14 h-14 rounded-full object-cover ring-2 ring-primary/30"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary to-primary/60 text-primary-foreground flex items-center justify-center font-semibold text-lg ring-2 ring-primary/30">
                      {initials || 'U'}
                    </div>
                  )}
                  {isPaid && (
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-gradient-to-br from-amber-400 to-primary flex items-center justify-center ring-2 ring-card">
                      <Crown size={12} className="text-white" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-sm truncate">{displayName}</p>
                  </div>
                  {email && (
                    <p className="text-xs text-muted-foreground truncate">{email}</p>
                  )}
                  <div className="mt-1 flex items-center gap-1.5">
                    <span className={cn(
                      'inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full',
                      isPaid
                        ? 'bg-gradient-to-r from-amber-400/20 to-primary/20 text-primary border border-primary/30'
                        : 'bg-muted text-muted-foreground'
                    )}>
                      {isPaid && <Crown size={10} />}
                      {isPaid ? 'Plano Premium' : 'Plano Free'}
                    </span>
                    <span className="text-[10px] text-muted-foreground inline-flex items-center gap-0.5">
                      Editar perfil <ChevronRight size={10} />
                    </span>
                  </div>
                </div>
              </motion.button>

              {/* Quick access: Search + Notifications */}
              <QuickAccessRow onClose={onClose} />


              <motion.button
                onClick={go('/plans')}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.05 }}
                whileTap={{ scale: 0.98 }}
                className={cn(
                  'w-full text-left rounded-2xl p-4 mb-5 relative overflow-hidden',
                  'border border-primary/25',
                  'bg-gradient-to-br from-primary/12 via-primary/[0.04] to-accent/10'
                )}
                aria-label={isPaid ? 'Gerenciar assinatura Premium' : 'Conhecer Finango Premium'}
              >
                <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-primary/15 blur-3xl pointer-events-none" />
                <img
                  src={foxLogo.url}
                  alt=""
                  aria-hidden="true"
                  className="absolute -right-4 -bottom-4 w-24 h-24 opacity-[0.08] pointer-events-none select-none"
                />
                <div className="relative flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-primary/20 text-primary flex items-center justify-center shrink-0">
                    <Crown size={22} className="fill-primary/30" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h3 className="font-semibold text-sm">
                        {isPaid ? 'Você é Premium' : 'Finango Premium'}
                      </h3>
                      <Sparkles size={12} className="text-primary" />
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
                      {isPaid
                        ? <>Obrigado por apoiar o Finango <span aria-hidden>❤️</span></>
                        : 'Desbloqueie recursos exclusivos para organizar sua vida financeira.'}
                    </p>
                  </div>
                  <span className="shrink-0 inline-flex items-center gap-1 text-xs font-semibold text-primary bg-primary/10 px-2.5 py-1.5 rounded-lg">
                    {isPaid ? 'Gerenciar' : 'Conhecer'}
                    <ChevronRight size={14} />
                  </span>
                </div>
              </motion.button>

              {/* Sections */}
              <div className="space-y-5">
                {sections.map((section, si) => (
                  <div key={section.title}>
                    <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-1 mb-2">
                      {section.title}
                    </h3>
                    <div className="rounded-2xl bg-secondary/30 border border-border/40 overflow-hidden divide-y divide-border/40">
                      {section.items.map((it, i) => {
                        const locked = it.premium && !isPaid;
                        return (
                          <motion.button
                            key={it.label}
                            onClick={it.action}
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: si * 0.03 + i * 0.02, duration: 0.2 }}
                            whileTap={{ scale: 0.98 }}
                            className={cn(
                              'w-full flex items-center gap-3 min-h-[64px] px-3 py-3',
                              'hover:bg-secondary/70 transition-colors text-left'
                            )}
                          >
                            <div className={cn(
                              'w-11 h-11 rounded-xl flex items-center justify-center shrink-0',
                              locked ? 'bg-primary/10 text-primary' : 'bg-background/70 text-foreground'
                            )}>
                              <it.icon size={20} strokeWidth={2} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-sm truncate">{it.label}</span>
                                {it.badge && (
                                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-accent/20 text-accent shrink-0">
                                    {it.badge}
                                  </span>
                                )}
                              </div>
                              {it.description && (
                                <p className="text-xs text-muted-foreground truncate mt-0.5">{it.description}</p>
                              )}
                            </div>
                            {locked ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/15 text-primary shrink-0">
                                <Lock size={10} />
                                Premium
                              </span>
                            ) : it.premium && isPaid ? (
                              <Crown size={12} className="text-primary shrink-0" aria-label="Recurso Premium" />
                            ) : null}
                            <ChevronRight size={16} className="text-muted-foreground/60 shrink-0" />
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              <p className="text-center text-[10px] text-muted-foreground/70 mt-6">
                Finango · v1.0
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function QuickAccessRow({ onClose }: { onClose: () => void }) {
  const { unreadCount } = useNotifications();
  const [notifOpen, setNotifOpen] = useState(false);

  const openSearch = () => {
    try { (navigator as any)?.vibrate?.(8); } catch { /* noop */ }
    onClose();
    setTimeout(() => window.dispatchEvent(new Event('finango:open-search')), 120);
  };

  return (
    <div className="grid grid-cols-2 gap-2 mb-4">
      <button
        onClick={openSearch}
        className="flex items-center gap-2 p-3 rounded-xl bg-secondary/60 hover:bg-secondary text-sm font-medium transition-all"
      >
        <div className="w-8 h-8 rounded-lg bg-primary/15 text-primary flex items-center justify-center">
          <Search size={16} />
        </div>
        <span>Buscar</span>
      </button>
      <button
        onClick={() => setNotifOpen(true)}
        className="flex items-center gap-2 p-3 rounded-xl bg-secondary/60 hover:bg-secondary text-sm font-medium transition-all relative"
      >
        <div className="w-8 h-8 rounded-lg bg-primary/15 text-primary flex items-center justify-center relative">
          <Bell size={16} />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center ring-2 ring-secondary">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </div>
        <span>Alertas</span>
      </button>
      <NotificationCenter
        variant="none"
        open={notifOpen}
        onOpenChange={setNotifOpen}
      />
    </div>
  );
}


