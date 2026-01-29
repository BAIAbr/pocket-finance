import { Home, BarChart3, FolderOpen, Settings } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

const navItems = [
  { path: '/', icon: Home, label: 'Início' },
  { path: '/reports', icon: BarChart3, label: 'Relatórios' },
  { path: '/categories', icon: FolderOpen, label: 'Categorias' },
  { path: '/settings', icon: Settings, label: 'Ajustes' },
];

export function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 glass border-t border-border safe-bottom">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                'nav-item touch-scale flex-1',
                isActive && 'nav-item-active'
              )}
            >
              <item.icon
                size={22}
                strokeWidth={isActive ? 2.5 : 2}
                className={cn(
                  'transition-all duration-200',
                  isActive && 'drop-shadow-[0_0_8px_hsl(var(--primary))]'
                )}
              />
              <span className={cn(
                'text-xs font-medium transition-colors',
                isActive ? 'text-primary' : 'text-muted-foreground'
              )}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
