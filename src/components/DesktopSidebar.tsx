import { Home, History, Brain, Target, Settings } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

const navItems = [
  { path: '/', icon: Home, label: 'Início' },
  { path: '/history', icon: History, label: 'Histórico' },
  { path: '/ai-insights', icon: Brain, label: 'IA Insights' },
  { path: '/savings', icon: Target, label: 'Metas' },
  { path: '/settings', icon: Settings, label: 'Ajustes' },
];

export function DesktopSidebar() {
  const location = useLocation();
  const navigate = useNavigate();

  const renderNavItem = (item: typeof navItems[0]) => {
    const isActive = location.pathname === item.path;
    return (
      <button
        key={item.path}
        onClick={() => navigate(item.path)}
        className={cn(
          'w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200',
          isActive
            ? 'bg-primary/15 text-primary shadow-sm'
            : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
        )}
      >
        <item.icon
          size={20}
          strokeWidth={isActive ? 2.5 : 2}
          className={cn(
            'transition-all duration-200 shrink-0',
            isActive && 'drop-shadow-[0_0_8px_hsl(var(--primary))]'
          )}
        />
        <span>{item.label}</span>
        {isActive && (
          <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />
        )}
      </button>
    );
  };

  return (
    <aside className="hidden lg:flex flex-col w-64 min-h-screen border-r border-border/50 bg-card/50 backdrop-blur-sm">
      {/* Logo / Brand */}
      <div className="px-6 py-6 border-b border-border/30">
        <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
          Finango
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">Gestão Financeira</p>
      </div>

      {/* Nav Items */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map(renderNavItem)}
      </nav>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-border/30">
        <p className="text-[10px] text-muted-foreground">
          © Finango – Todos os direitos reservados.
        </p>
      </div>
    </aside>
  );
}
