import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Plus, X, ArrowDownLeft, ArrowUpRight, Target, TrendingUp,
  Camera, ArrowLeftRight, CreditCard, CalendarClock, Star
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { AddTransactionModal } from '@/components/AddTransactionModal';
import { usePlanAccess } from '@/hooks/usePlanAccess';

type Action = {
  icon: any;
  label: string;
  color: string;
  premium?: boolean;
  onClick: () => void;
};

export function QuickActionsFab({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const [showPulse, setShowPulse] = useState(false);
  const [txModal, setTxModal] = useState<null | 'income' | 'expense'>(null);
  const navigate = useNavigate();
  const { planCode } = usePlanAccess();
  const isPaid = planCode !== 'free';

  useEffect(() => {
    const t = setTimeout(() => setShowPulse(true), 60000);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  const close = () => setOpen(false);
  const go = (path: string) => () => { close(); navigate(path); };
  const openTx = (t: 'income' | 'expense') => () => { close(); setTxModal(t); };
  const soon = (label: string) => () => {
    close();
    toast.info(`${label} em breve`, { description: 'Estamos preparando este módulo.' });
  };

  const actions: Action[] = [
    { icon: ArrowDownLeft, label: 'Nova Receita', color: 'text-income bg-income/15', onClick: openTx('income') },
    { icon: ArrowUpRight, label: 'Nova Despesa', color: 'text-expense bg-expense/15', onClick: openTx('expense') },
    { icon: Target, label: 'Depositar na Meta', color: 'text-primary bg-primary/15', onClick: go('/savings') },
    { icon: TrendingUp, label: 'Novo Investimento', color: 'text-accent bg-accent/15', premium: true, onClick: soon('Investimentos') },
    { icon: Camera, label: 'Scanner Inteligente', color: 'text-primary bg-primary/15', premium: true, onClick: soon('Scanner Inteligente') },
    { icon: ArrowLeftRight, label: 'Transferência', color: 'text-foreground bg-secondary', onClick: soon('Transferência') },
    { icon: CreditCard, label: 'Compra Parcelada', color: 'text-expense bg-expense/15', onClick: go('/installments') },
    { icon: CalendarClock, label: 'Lembrete Financeiro', color: 'text-accent bg-accent/15', onClick: go('/recurring') },
  ];

  return (
    <>
      {/* FAB */}
      <motion.button
        onClick={() => { setShowPulse(false); setOpen((v) => !v); }}
        className={cn(
          'btn-float group lg:bottom-8 z-50',
          showPulse && !open && 'animate-[fab-pulse_2s_ease-in-out_infinite]',
          className
        )}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.3 }}
        whileTap={{ scale: 0.92 }}
        aria-label={open ? 'Fechar menu de ações' : 'Abrir menu de ações'}
      >
        <motion.div animate={{ rotate: open ? 45 : 0 }} transition={{ type: 'spring', stiffness: 300, damping: 20 }}>
          <Plus size={24} strokeWidth={2.5} className="text-primary-foreground" />
        </motion.div>
      </motion.button>

      {/* Actions menu */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={close}
            />

            {/* Mobile: bottom sheet */}
            <motion.div
              className="fixed inset-x-0 bottom-0 z-40 lg:hidden bg-card rounded-t-3xl shadow-2xl pb-28 safe-bottom"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            >
              <div className="flex flex-col items-center pt-3 pb-2">
                <div className="w-10 h-1.5 rounded-full bg-muted-foreground/30" />
              </div>
              <div className="flex items-center justify-between px-5 pb-2">
                <h2 className="text-lg font-semibold">Ações rápidas</h2>
                <button onClick={close} className="p-2 rounded-full hover:bg-secondary touch-scale" aria-label="Fechar">
                  <X size={20} />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2 px-3 pt-2">
                {actions.map((a, i) => (
                  <motion.button
                    key={a.label}
                    onClick={a.onClick}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="flex flex-col items-start gap-2 p-3 rounded-2xl bg-secondary/40 hover:bg-secondary text-left touch-scale relative"
                  >
                    <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', a.color)}>
                      <a.icon size={20} />
                    </div>
                    <div className="text-sm font-medium leading-tight">{a.label}</div>
                    {a.premium && !isPaid && (
                      <span className="absolute top-2 right-2 inline-flex items-center gap-1 text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-primary/15 text-primary">
                        <Star size={9} className="fill-primary" />
                        Premium
                      </span>
                    )}
                  </motion.button>
                ))}
              </div>
            </motion.div>

            {/* Desktop: popover above FAB */}
            <motion.div
              className="hidden lg:block fixed bottom-24 right-8 z-50 w-80 bg-card rounded-2xl shadow-2xl border border-border/50 overflow-hidden"
              initial={{ opacity: 0, y: 10, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.96 }}
              transition={{ type: 'spring', damping: 22, stiffness: 260 }}
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
                <h3 className="text-sm font-semibold">Ações rápidas</h3>
                <button onClick={close} className="p-1.5 rounded-full hover:bg-secondary" aria-label="Fechar">
                  <X size={16} />
                </button>
              </div>
              <div className="max-h-[60vh] overflow-y-auto p-2">
                {actions.map((a) => (
                  <button
                    key={a.label}
                    onClick={a.onClick}
                    className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-secondary text-left transition-colors"
                  >
                    <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center shrink-0', a.color)}>
                      <a.icon size={18} />
                    </div>
                    <span className="text-sm font-medium flex-1">{a.label}</span>
                    {a.premium && !isPaid && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-primary/15 text-primary">
                        <Star size={10} className="fill-primary" />
                        Premium
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AddTransactionModal
        isOpen={txModal !== null}
        onClose={() => setTxModal(null)}
        initialType={txModal ?? 'expense'}
      />
    </>
  );
}
