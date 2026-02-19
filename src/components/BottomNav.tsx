import { Home, Brain, PiggyBank, Settings, Trophy } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

const navItems = [
  { path: '/', icon: Home, label: 'Início' },
  { path: '/achievements', icon: Trophy, label: 'Conquistas' },
  { path: '/ai-insights', icon: Brain, label: 'IA' },
  { path: '/savings', icon: PiggyBank, label: 'Cofrinho' },
  { path: '/settings', icon: Settings, label: 'Ajustes' },
];

export function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 glass border-t border-border/50 safe-bottom">
      <div className="flex items-center justify-around h-18 max-w-lg mx-auto py-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                'nav-item touch-scale flex-1 relative group',
                isActive && 'nav-item-active'
              )}
            >
              {/* Active indicator */}
              {isActive && (
                <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-8 h-1 rounded-full bg-primary animate-fade-in" />
              )}
              
              <div className={cn(
                'w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200',
                isActive ? 'bg-primary/15' : 'group-hover:bg-secondary'
              )}>
                <item.icon
                  size={22}
                  strokeWidth={isActive ? 2.5 : 2}
                  className={cn(
                    'transition-all duration-200',
                    isActive && 'drop-shadow-[0_0_10px_hsl(var(--primary))]'
                  )}
                />
              </div>
              
              <span className={cn(
                'text-xs font-medium transition-all duration-200 mt-1',
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
