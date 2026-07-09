import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  X, TrendingUp, Bot, Camera, FileDown, BarChart3, FileText,
  Crown, Settings as SettingsIcon, User, HelpCircle, Sparkles, ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { usePlanAccess } from '@/hooks/usePlanAccess';

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

export function MoreSheet({ open, onClose }: MoreSheetProps) {
  const navigate = useNavigate();
  const { planCode } = usePlanAccess();
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

  const go = (path: string) => () => { onClose(); navigate(path); };
  const soon = (label: string) => () => {
    toast.info(`${label} em breve`, { description: 'Estamos preparando este módulo.' });
  };
  const goPremiumOr = (path: string) => () => {
    onClose();
    navigate(isPaid ? path : '/plans');
  };
  const premiumSoon = (label: string) => () => {
    if (!isPaid) { onClose(); navigate('/plans'); return; }
    soon(label)();
  };

  const items: Item[] = useMemo(() => [
    { icon: TrendingUp, label: 'Investimentos', description: 'Acompanhe rendimentos e carteira', badge: 'Novo', action: go('/investments') },
    { icon: Bot, label: 'Finango IA', description: 'Copiloto financeiro inteligente', premium: true, action: goPremiumOr('/ai-insights') },
    { icon: Camera, label: 'Scanner Inteligente', description: 'Leia notas fiscais com a câmera', premium: true, action: premiumSoon('Scanner Inteligente') },
    { icon: FileDown, label: 'Importar Extratos', description: 'Importe CSV/OFX do seu banco', premium: true, action: premiumSoon('Importar Extratos') },
    { icon: BarChart3, label: 'Relatórios', description: 'Análises detalhadas por período', premium: true, action: goPremiumOr('/reports') },
    { icon: FileText, label: 'Exportar Dados', description: 'Baixe suas informações', action: go('/reports') },
    { icon: User, label: 'Perfil', description: 'Sua conta e preferências', action: go('/settings') },
    { icon: SettingsIcon, label: 'Configurações', description: 'Ajustes do aplicativo', action: go('/settings') },
    { icon: HelpCircle, label: 'Ajuda', description: 'Fale com o suporte', action: () => { onClose(); window.location.href = 'mailto:suporte@finango.online'; } },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [isPaid]);

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
            className="fixed inset-x-0 bottom-0 z-50 bg-card rounded-t-3xl shadow-2xl max-h-[88vh] flex flex-col safe-bottom"
            initial={{ y: '100%', opacity: 0.8 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0.8 }}
            transition={{ type: 'spring', damping: 32, stiffness: 320 }}
          >
            {/* Handle */}
            <div className="flex flex-col items-center pt-3 pb-1 shrink-0">
              <div className="w-10 h-1.5 rounded-full bg-muted-foreground/30" />
            </div>

            {/* Header */}
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
              {/* Premium Card */}
              <motion.button
                onClick={go('/plans')}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
                className={cn(
                  'w-full text-left rounded-2xl p-4 mb-4 relative overflow-hidden touch-scale',
                  'border border-primary/20',
                  'bg-gradient-to-br from-primary/15 via-primary/5 to-accent/10'
                )}
                aria-label={isPaid ? 'Gerenciar assinatura Premium' : 'Conhecer Finango Premium'}
              >
                <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-primary/10 blur-2xl pointer-events-none" />
                <div className="relative flex items-start gap-3">
                  <div className="w-11 h-11 rounded-xl bg-primary/20 text-primary flex items-center justify-center shrink-0">
                    <Crown size={22} className="fill-primary/30" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-sm">
                        {isPaid ? 'Você é Premium' : 'Finango Premium'}
                      </h3>
                      <Sparkles size={12} className="text-primary" />
                    </div>
                    {isPaid ? (
                      <p className="text-xs text-muted-foreground mt-1">
                        Obrigado por apoiar o Finango <span aria-hidden>❤️</span>
                      </p>
                    ) : (
                      <>
                        <p className="text-xs text-muted-foreground mt-1 mb-2">
                          Desbloqueie recursos exclusivos:
                        </p>
                        <ul className="text-[11px] text-muted-foreground space-y-0.5 mb-3">
                          <li>• IA ilimitada</li>
                          <li>• Scanner Inteligente</li>
                          <li>• Relatórios avançados</li>
                          <li>• Importação inteligente</li>
                          <li>• Prioridade nas novidades</li>
                        </ul>
                      </>
                    )}
                    <span className="inline-flex items-center gap-1 mt-2 text-xs font-semibold text-primary">
                      {isPaid ? 'Gerenciar assinatura' : 'Conhecer Premium'}
                      <ChevronRight size={14} />
                    </span>
                  </div>
                </div>
              </motion.button>

              {/* Items */}
              <div className="flex flex-col gap-2">
                {items.map((it, i) => (
                  <motion.button
                    key={it.label}
                    onClick={it.action}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.02, duration: 0.2 }}
                    whileTap={{ scale: 0.98 }}
                    className={cn(
                      'flex items-center gap-3 min-h-[64px] px-3 py-3 rounded-2xl',
                      'bg-secondary/40 hover:bg-secondary transition-colors text-left'
                    )}
                  >
                    <div className="w-11 h-11 rounded-xl bg-secondary text-foreground flex items-center justify-center shrink-0">
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
                    {it.premium && !isPaid && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/15 text-primary shrink-0">
                        <Crown size={10} />
                        Premium
                      </span>
                    )}
                    <ChevronRight size={16} className="text-muted-foreground/60 shrink-0" />
                  </motion.button>
                ))}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
