import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, Home, History, Brain, Target, TrendingUp, Settings, User,
  Wallet, Repeat, BarChart3, Crown, PiggyBank, Layers, ArrowUpRight, ArrowDownRight,
} from 'lucide-react';
import {
  CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { useEffectiveFinance } from '@/hooks/useEffectiveFinance';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const routes = [
  { path: '/', icon: Home, label: 'Início', hint: 'Dashboard' },
  { path: '/history', icon: History, label: 'Histórico', hint: 'Todos os lançamentos' },
  { path: '/ai-insights', icon: Brain, label: 'Finango IA', hint: 'Assistente inteligente' },
  { path: '/savings', icon: Target, label: 'Metas / Cofrinho', hint: 'Piggy banks' },
  { path: '/planning', icon: TrendingUp, label: 'Planejamento', hint: 'Simulações e projeções' },
  { path: '/investments', icon: TrendingUp, label: 'Investimentos', hint: 'Carteira e ativos' },
  { path: '/recurring', icon: Repeat, label: 'Recorrentes', hint: 'Contas fixas' },
  { path: '/installments', icon: Layers, label: 'Parcelamentos' },
  { path: '/categories', icon: PiggyBank, label: 'Categorias' },
  { path: '/reports', icon: BarChart3, label: 'Relatórios' },
  { path: '/plans', icon: Crown, label: 'Planos & Premium' },
  { path: '/profile', icon: User, label: 'Perfil' },
  { path: '/settings', icon: Settings, label: 'Configurações' },
];

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function GlobalSearch({ open, onOpenChange }: Props) {
  const navigate = useNavigate();
  const { transactions, piggyBanks, categories } = useEffectiveFinance() as any;
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!open) setQuery('');
  }, [open]);

  const go = (path: string) => {
    onOpenChange(false);
    navigate(path);
  };

  const txMatches = useMemo(() => {
    if (!query.trim()) return (transactions || []).slice(0, 5);
    return (transactions || []).slice(0, 200);
  }, [transactions, query]);

  const currency = (v: number) =>
    Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const formatDate = (iso?: string) => {
    if (!iso) return '';
    try { return format(parseISO(iso), "d MMM yyyy", { locale: ptBR }); } catch { return ''; }
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="Buscar em tudo — páginas, lançamentos, metas…"
        value={query}
        onValueChange={setQuery}
      />
      <CommandList className="max-h-[70vh]">
        <CommandEmpty>Nenhum resultado encontrado.</CommandEmpty>

        <CommandGroup heading="Navegar">
          {routes.map(r => (
            <CommandItem
              key={r.path}
              value={`${r.label} ${r.hint || ''} ${r.path}`}
              onSelect={() => go(r.path)}
            >
              <r.icon className="text-primary" />
              <span className="flex-1">{r.label}</span>
              {r.hint && (
                <span className="text-xs text-muted-foreground">{r.hint}</span>
              )}
            </CommandItem>
          ))}
        </CommandGroup>

        {(piggyBanks?.length ?? 0) > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Cofrinhos & metas">
              {(piggyBanks as any[]).map(p => (
                <CommandItem
                  key={p.id}
                  value={`cofrinho ${p.name}`}
                  onSelect={() => go('/savings')}
                >
                  <PiggyBank className="text-primary" />
                  <span className="flex-1">{p.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {currency(Number(p.current_amount || 0))}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {(categories?.length ?? 0) > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Categorias">
              {(categories as any[]).slice(0, 30).map(c => (
                <CommandItem
                  key={c.id}
                  value={`categoria ${c.name}`}
                  onSelect={() => go('/categories')}
                >
                  <div
                    className="w-4 h-4 rounded-md"
                    style={{ background: c.color || 'hsl(var(--primary))' }}
                  />
                  <span className="flex-1">{c.name}</span>
                  <span className="text-xs text-muted-foreground capitalize">{c.type}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {txMatches.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading={query ? 'Lançamentos' : 'Últimos lançamentos'}>
              {(txMatches as any[]).map(t => {
                const isIncome = t.type === 'income';
                const Icon = isIncome ? ArrowUpRight : ArrowDownRight;
                const cat = categories?.find((c: any) => c.id === t.category_id);
                return (
                  <CommandItem
                    key={t.id}
                    value={`${t.description || ''} ${cat?.name || ''} ${t.amount}`}
                    onSelect={() => go('/history')}
                  >
                    <Icon className={cn(isIncome ? 'text-emerald-500' : 'text-red-500')} />
                    <div className="flex-1 min-w-0">
                      <p className="truncate">{t.description || cat?.name || (isIncome ? 'Entrada' : 'Despesa')}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {formatDate(t.date || t.created_at)}
                        {cat?.name ? ` · ${cat.name}` : ''}
                      </p>
                    </div>
                    <span className={cn('text-xs font-semibold', isIncome ? 'text-emerald-500' : 'text-red-500')}>
                      {isIncome ? '+' : '−'} {currency(Number(t.amount))}
                    </span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </>
        )}
      </CommandList>

      <div className="border-t border-border/50 px-3 py-2 flex items-center justify-between text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <Search size={12} />
          Busca global do Finango
        </span>
        <span className="hidden sm:flex items-center gap-1">
          <kbd className="px-1.5 py-0.5 rounded bg-muted text-[10px] font-mono">Ctrl</kbd>
          <kbd className="px-1.5 py-0.5 rounded bg-muted text-[10px] font-mono">K</kbd>
        </span>
      </div>
    </CommandDialog>
  );
}

/**
 * Compact trigger button, matches the NotificationCenter icon variant.
 */
export function GlobalSearchButton({
  onClick, className, variant = 'icon',
}: { onClick: () => void; className?: string; variant?: 'icon' | 'menu-item' }) {
  if (variant === 'menu-item') {
    return (
      <button
        onClick={onClick}
        className={cn(
          'w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-all',
          className
        )}
      >
        <Search size={20} />
        <span>Buscar</span>
        <span className="ml-auto hidden sm:flex items-center gap-1 text-[10px]">
          <kbd className="px-1.5 py-0.5 rounded bg-muted font-mono">Ctrl</kbd>
          <kbd className="px-1.5 py-0.5 rounded bg-muted font-mono">K</kbd>
        </span>
      </button>
    );
  }
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-10 h-10 rounded-xl bg-secondary/70 hover:bg-secondary text-foreground flex items-center justify-center transition-all',
        className
      )}
      aria-label="Buscar (Ctrl+K)"
    >
      <Search size={18} />
    </button>
  );
}
