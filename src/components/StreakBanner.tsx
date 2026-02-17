import { useState } from 'react';
import { Flame, Check, Circle, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { useFinanceContext } from '@/contexts/FinanceContext';
import { format, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { getIconByName } from '@/lib/icons';

interface StreakBannerProps {
  currentStreak: number;
  hasRegisteredToday: boolean;
  onRegisterClick: () => void;
}

export function StreakBanner({ currentStreak, hasRegisteredToday, onRegisterClick }: StreakBannerProps) {
  const [open, setOpen] = useState(false);
  const { transactions, categories } = useFinanceContext();

  const todayTransactions = (transactions as any[]).filter((t) =>
    isToday(new Date(t.date))
  );

  const formatCurrency = (v: number) =>
    v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const getCategoryInfo = (catId: string | null) => {
    if (!catId) return { name: 'Sem categoria', icon: 'Circle', color: '#888' };
    const cat = (categories as any[]).find((c) => c.id === catId);
    return cat ?? { name: 'Sem categoria', icon: 'Circle', color: '#888' };
  };

  return (
    <div className="rounded-2xl bg-card border border-border/50 p-4">
      <div className="flex items-center justify-between">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <button className="flex items-center gap-3 text-left">
              <div
                className={cn(
                  'relative flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-500',
                  hasRegisteredToday
                    ? 'bg-orange-500/20 shadow-[0_0_16px_4px_hsl(25_95%_53%/0.35)]'
                    : 'bg-orange-500/10'
                )}
              >
                <Flame
                  className={cn(
                    'w-5 h-5 transition-all duration-500',
                    hasRegisteredToday
                      ? 'text-orange-400 fill-orange-500 drop-shadow-[0_0_6px_hsl(25_95%_53%/0.6)]'
                      : 'text-orange-500'
                  )}
                />
                {hasRegisteredToday && (
                  <span className="absolute inset-0 rounded-xl animate-ping bg-orange-500/20 pointer-events-none" style={{ animationDuration: '1.5s', animationIterationCount: '3' }} />
                )}
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Sequência atual</p>
                <div className="flex items-center gap-1.5">
                  <p className="text-xl font-bold">{currentStreak} {currentStreak === 1 ? 'dia' : 'dias'}</p>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </div>
              </div>
            </button>
          </SheetTrigger>

          <SheetContent side="bottom" className="rounded-t-2xl max-h-[70vh]">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                <Flame className="w-5 h-5 text-orange-500 fill-orange-500" />
                Registros de hoje
              </SheetTitle>
            </SheetHeader>

            <div className="mt-4 space-y-2 overflow-y-auto max-h-[50vh] pr-1">
              {todayTransactions.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground text-sm">Nenhum registro hoje ainda.</p>
                  <button
                    onClick={() => { setOpen(false); onRegisterClick(); }}
                    className="mt-3 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium"
                  >
                    Registrar agora
                  </button>
                </div>
              ) : (
                todayTransactions.map((t) => {
                  const cat = getCategoryInfo(t.category_id);
                  const IconComp = getIconByName(cat.icon);
                  const isIncome = t.type === 'income';

                  return (
                    <div key={t.id} className="flex items-center gap-3 p-3 rounded-xl bg-secondary/50">
                      <div
                        className="flex items-center justify-center w-9 h-9 rounded-lg"
                        style={{ backgroundColor: `${cat.color}20` }}
                      >
                        {IconComp && <IconComp className="w-4 h-4" style={{ color: cat.color }} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{t.description || cat.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(t.date), "HH:mm", { locale: ptBR })} • {cat.name}
                        </p>
                      </div>
                      <span className={cn('text-sm font-mono-amount font-semibold', isIncome ? 'text-income' : 'text-expense')}>
                        {isIncome ? '+' : '-'}{formatCurrency(t.amount)}
                      </span>
                    </div>
                  );
                })
              )}
            </div>

            {todayTransactions.length > 0 && (
              <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{todayTransactions.length} registro{todayTransactions.length > 1 ? 's' : ''}</span>
                <span className="font-semibold">
                  Saldo: {formatCurrency(
                    todayTransactions.reduce((acc: number, t: any) => acc + (t.type === 'income' ? t.amount : -t.amount), 0)
                  )}
                </span>
              </div>
            )}
          </SheetContent>
        </Sheet>

        {hasRegisteredToday ? (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 animate-scale-in">
            <Check className="w-4 h-4" />
            <span className="text-xs font-medium">Registrado</span>
          </div>
        ) : (
          <button
            onClick={onRegisterClick}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Circle className="w-3 h-3" />
            Registrar
          </button>
        )}
      </div>
    </div>
  );
}
