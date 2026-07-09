import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  X, TrendingUp, Bot, Camera, FileDown, BarChart3, FileText,
  Crown, Settings as SettingsIcon, User, HelpCircle, Star
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { usePlanAccess } from '@/hooks/usePlanAccess';
import { useEffect } from 'react';

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
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  const go = (path: string) => () => { onClose(); navigate(path); };
  const soon = (label: string) => () => {
    toast.info(`${label} em breve`, { description: 'Estamos preparando este módulo.' });
  };

  const items: Item[] = [
    { icon: TrendingUp, label: 'Investimentos', description: 'Acompanhe rendimentos e carteira', badge: 'Novo', action: go('/investments') },
    { icon: Bot, label: 'Finango IA', description: 'Copiloto financeiro inteligente', premium: true, action: go('/ai-insights') },
    { icon: Camera, label: 'Scanner Inteligente', description: 'Leia notas fiscais com a câmera', premium: true, action: soon('Scanner Inteligente') },
    { icon: FileDown, label: 'Importar Extratos', description: 'Importe CSV/OFX do seu banco', premium: true, action: soon('Importar Extratos') },
    { icon: BarChart3, label: 'Relatórios', description: 'Análises detalhadas por período', action: go('/reports') },
    { icon: FileText, label: 'Exportar Dados', description: 'Baixe suas informações', action: go('/reports') },
    { icon: Crown, label: 'Plano Premium', description: isPaid ? 'Você é Premium' : 'Desbloqueie tudo', action: go('/plans') },
    { icon: SettingsIcon, label: 'Configurações', action: go('/settings') },
    { icon: User, label: 'Perfil', action: go('/settings') },
    { icon: HelpCircle, label: 'Ajuda', description: 'Fale com o suporte', action: () => { window.location.href = 'mailto:suporte@finango.online'; } },
  ];

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
          />
          <motion.div
            className="fixed inset-x-0 bottom-0 z-50 bg-card rounded-t-3xl shadow-2xl max-h-[85vh] flex flex-col safe-bottom"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          >
            {/* Handle + header */}
            <div className="flex flex-col items-center pt-3 pb-2 shrink-0">
              <div className="w-10 h-1.5 rounded-full bg-muted-foreground/30" />
            </div>
            <div className="flex items-center justify-between px-5 pb-3 shrink-0">
              <h2 className="text-lg font-semibold">Mais opções</h2>
              <button
                onClick={onClose}
                className="p-2 rounded-full hover:bg-secondary touch-scale"
                aria-label="Fechar"
              >
                <X size={20} />
              </button>
            </div>

            {/* Items */}
            <div className="overflow-y-auto px-3 pb-6">
              <div className="grid grid-cols-1 gap-2">
                {items.map((it, i) => (
                  <motion.button
                    key={it.label}
                    onClick={it.action}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.02 }}
                    className={cn(
                      'flex items-center gap-3 p-3 rounded-2xl bg-secondary/40 hover:bg-secondary transition-all text-left touch-scale',
                    )}
                  >
                    <div className={cn(
                      'w-11 h-11 rounded-xl flex items-center justify-center shrink-0',
                      it.premium ? 'bg-primary/15 text-primary' : 'bg-secondary text-foreground'
                    )}>
                      <it.icon size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm">{it.label}</span>
                        {it.premium && !isPaid && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-primary/15 text-primary">
                            <Star size={10} className="fill-primary" />
                            Premium
                          </span>
                        )}
                        {it.badge && (
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-accent/20 text-accent">
                            {it.badge}
                          </span>
                        )}
                      </div>
                      {it.description && (
                        <p className="text-xs text-muted-foreground truncate">{it.description}</p>
                      )}
                    </div>
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
