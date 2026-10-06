import { useState } from 'react';
import { Home, History, Brain, Target, Settings, TrendingUp, CalendarDays, CreditCard, BarChart3, Repeat, ChevronDown, Wallet, User } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { NotificationCenter } from '@/components/NotificationCenter';
import { GlobalSearchButton } from '@/components/GlobalSearch';
import { useAuth } from '@/contexts/AuthContext';

type Item = { path: string; icon: any; label: string; badge?: boolean };

const groups: { label?: string; items: Item[] }[] = [
  { items: [{ path: '/', icon: Home, label: 'Início' }] },
  {
    label: 'Dinheiro',
    items: [
      { path: '/money', icon: Wallet, label: 'Visão geral' },
      { path: '/history', icon: History, label: 'Transações' },
      { path: '/cards', icon: CreditCard, label: 'Cartões' },
      { path: '/recurring', icon: Repeat, label: 'Recorrências' },
    ],
  },
  {
    label: 'Planejamento',
    items: [
      { path: '/planning', icon: TrendingUp, label: 'Visão geral' },
      { path: '/savings', icon: Target, label: 'Metas e Reserva' },
    ],
  },
  {
    items: [
      { path: '/investments', icon: Wallet, label: 'Investimentos' },
      { path: '/ai-insights', icon: Brain, label: 'FOX', badge: true },
    ],
  },
  {
    items: [
      { path: '/reports', icon: BarChart3, label: 'Relatórios' },
      { path: '/calendar', icon: CalendarDays, label: 'Calendário' },
    ],
  },
  { items: [{ path: '/settings', icon: Settings, label: 'Configurações' }] },
];

export function DesktopSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth() as any;
  const [closed, setClosed] = useState<Record<string, boolean>>({});

  const renderItem = (item: Item, nested: boolean) => {
    const isActive = location.pathname === item.path;
    return (
      <button
        key={item.path}
        onClick={() => navigate(item.path)}
        className={cn(
          'w-full flex items-center gap-3 rounded-lg text-sm font-medium transition-colors',
          nested ? 'pl-9 pr-3 py-2' : 'px-3 py-2.5',
          isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
        )}
      >
        {!nested && <item.icon size={18} strokeWidth={isActive ? 2.4 : 2} className="shrink-0" />}
        <span className="truncate">{item.label}</span>
        {item.badge && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />}
      </button>
    );
  };

  const name = user?.user_metadata?.name || user?.email?.split('@')[0] || 'Minha conta';

  return (
    <aside className="hidden lg:flex flex-col w-64 min-h-screen border-r border-border bg-sidebar sticky top-0 h-screen">
      <div className="px-5 py-5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-lg font-semibold tracking-tight">FINANGO</span>
        </div>
        <div className="flex items-center gap-1">
          <GlobalSearchButton onClick={() => window.dispatchEvent(new Event('finango:open-search'))} />
          <NotificationCenter variant="icon" />
        </div>
      </div>

      <nav className="flex-1 px-3 pb-4 overflow-y-auto">
        {groups.map((g, gi) => (
          <div key={gi} className={cn('py-2', gi > 0 && !g.label && 'border-t border-border/60')}>
            {g.label ? (
              <>
                <button
                  onClick={() => setClosed(c => ({ ...c, [g.label!]: !c[g.label!] }))}
                  className="w-full flex items-center justify-between px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground"
                >
                  {g.label}
                  <ChevronDown size={14} className={cn('transition-transform', closed[g.label] && '-rotate-90')} />
                </button>
                {!closed[g.label] && <div className="space-y-0.5">{g.items.map(i => renderItem(i, true))}</div>}
              </>
            ) : (
              <div className="space-y-0.5">{g.items.map(i => renderItem(i, false))}</div>
            )}
          </div>
        ))}
      </nav>

      <button
        onClick={() => navigate('/profile')}
        className="m-3 mb-16 flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-2.5 text-left hover:bg-secondary transition-colors"
      >
        <span className="w-8 h-8 rounded-full bg-primary/15 text-primary flex items-center justify-center shrink-0"><User size={16} /></span>
        <span className="min-w-0">
          <span className="block text-sm font-medium truncate">{name}</span>
          <span className="block font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Perfil</span>
        </span>
      </button>
    </aside>
  );
}
