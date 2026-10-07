import { useEffect, useState } from 'react';
import { Home, Brain, Target, TrendingUp, Wallet, LineChart, MoreHorizontal, ChevronDown, User } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { NotificationCenter } from '@/components/NotificationCenter';
import { GlobalSearchButton } from '@/components/GlobalSearch';
import { useAuth } from '@/contexts/AuthContext';

type Sub = { path: string; label: string };
type Module = { id: string; label: string; icon: any; path?: string; children?: Sub[]; match?: string[] };

const modules: Module[] = [
  { id: 'home', label: 'Início', icon: Home, path: '/' },
  {
    id: 'money', label: 'Dinheiro', icon: Wallet,
    children: [
      { path: '/money', label: 'Visão geral' },
      { path: '/history', label: 'Transações' },
      { path: '/cards', label: 'Cartões' },
      { path: '/cards/reports', label: 'Faturas' },
      { path: '/recurring', label: 'Recorrências' },
    ],
    match: ['/cards/'],
  },
  {
    id: 'planning', label: 'Planejamento', icon: Target,
    children: [
      { path: '/planning', label: 'Visão geral' },
      { path: '/savings', label: 'Metas e Reserva' },
    ],
  },
  { id: 'investments', label: 'Investimentos', icon: LineChart, path: '/investments' },
  { id: 'fox', label: 'FOX', icon: Brain, path: '/ai-insights' },
  {
    id: 'more', label: 'Mais', icon: MoreHorizontal,
    children: [
      { path: '/reports', label: 'Relatórios' },
      { path: '/calendar', label: 'Calendário' },
      { path: '/settings', label: 'Configurações' },
    ],
    match: ['/settings/', '/security', '/plans'],
  },
];

export function DesktopSidebar() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user, profile } = useAuth() as any;

  const inModule = (m: Module) =>
    (m.path && pathname === m.path) ||
    !!m.children?.some(c => pathname === c.path) ||
    !!m.match?.some(p => pathname.startsWith(p));

  const activeId = modules.find(inModule)?.id;
  const [open, setOpen] = useState<Record<string, boolean>>(() => (activeId ? { [activeId]: true } : {}));
  useEffect(() => {
    if (activeId) setOpen(o => (o[activeId] ? o : { ...o, [activeId]: true }));
  }, [activeId]);

  const isSubActive = (c: Sub, m: Module) => {
    if (pathname === c.path) return true;
    // Detalhe de cartão (/cards/:id) destaca "Cartões"
    return m.id === 'money' && c.path === '/cards' && pathname.startsWith('/cards/') && pathname !== '/cards/reports';
  };

  const name = profile?.name || user?.user_metadata?.name || user?.email?.split('@')[0] || 'Minha conta';

  return (
    <aside className="hidden lg:flex flex-col w-60 min-h-screen border-r border-border bg-sidebar sticky top-0 h-screen">
      <div className="px-5 py-5 flex items-center justify-between gap-2">
        <span className="text-base font-semibold tracking-[0.12em]">FINANGO</span>
        <div className="flex items-center gap-1">
          <GlobalSearchButton onClick={() => window.dispatchEvent(new Event('finango:open-search'))} />
          <NotificationCenter variant="icon" />
        </div>
      </div>

      <nav aria-label="Navegação principal" className="flex-1 px-3 pb-4 overflow-y-auto space-y-0.5">
        {modules.map(m => {
          const active = activeId === m.id;
          const expanded = !!open[m.id];
          const base = cn(
            'relative w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            active ? 'text-foreground' : 'text-muted-foreground hover:bg-secondary/70 hover:text-foreground',
            active && !m.children && 'bg-primary/10',
          );
          const indicator = active && (
            <span aria-hidden className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-0.5 rounded-full bg-primary" />
          );
          const icon = <m.icon size={18} strokeWidth={active ? 2.3 : 1.9} className={cn('shrink-0', active && 'text-primary')} />;

          if (!m.children) {
            return (
              <button key={m.id} onClick={() => navigate(m.path!)} className={base} aria-current={active ? 'page' : undefined}>
                {indicator}{icon}<span className="truncate">{m.label}</span>
              </button>
            );
          }

          return (
            <div key={m.id}>
              <button
                onClick={() => setOpen(o => ({ ...o, [m.id]: !o[m.id] }))}
                className={base}
                aria-expanded={expanded}
                aria-controls={`nav-${m.id}`}
              >
                {indicator}{icon}
                <span className="truncate">{m.label}</span>
                <ChevronDown size={14} className={cn('ml-auto transition-transform text-muted-foreground', !expanded && '-rotate-90')} />
              </button>
              {expanded && (
                <div id={`nav-${m.id}`} className="mt-0.5 mb-1 ml-[22px] pl-3 border-l border-border/60 space-y-0.5">
                  {m.children.map(c => {
                    const subActive = isSubActive(c, m);
                    return (
                      <button
                        key={c.path}
                        onClick={() => navigate(c.path)}
                        aria-current={subActive ? 'page' : undefined}
                        className={cn(
                          'w-full text-left rounded-md px-3 py-2 text-[13px] transition-colors',
                          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                          subActive ? 'bg-primary/10 text-foreground font-medium' : 'text-muted-foreground hover:bg-secondary/70 hover:text-foreground',
                        )}
                      >
                        {c.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <button
        onClick={() => navigate('/profile')}
        aria-current={pathname === '/profile' ? 'page' : undefined}
        className={cn(
          'm-3 mb-16 flex items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors border-t border-border/60',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          pathname === '/profile' ? 'bg-primary/10' : 'hover:bg-secondary/70',
        )}
      >
        {profile?.avatar_url ? (
          <img src={profile.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover shrink-0" />
        ) : (
          <span className="w-8 h-8 rounded-full bg-primary/15 text-primary flex items-center justify-center shrink-0"><User size={16} /></span>
        )}
        <span className="min-w-0">
          <span className="block text-sm font-medium truncate">{name}</span>
          <span className="block font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Perfil</span>
        </span>
      </button>
    </aside>
  );
}
