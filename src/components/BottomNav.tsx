import { useState } from 'react';
import { Home, TrendingUp, Target, History, Menu } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { MoreSheet } from '@/components/MoreSheet';

const mainNavItems = [
  { path: '/', icon: Home, label: 'Início' },
  { path: '/history', icon: History, label: 'Histórico' },
  { path: '/planning', icon: TrendingUp, label: 'Plano' },
  { path: '/savings', icon: Target, label: 'Metas' },
];

export function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const [moreOpen, setMoreOpen] = useState(false);

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-40 glass border-t border-border/50 safe-bottom">
        <div className="flex items-center justify-around h-18 max-w-lg mx-auto py-2">
          {mainNavItems.map((item) => {
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
                    className={cn('transition-all duration-200', isActive && 'drop-shadow-[0_0_10px_hsl(var(--primary))]')}
                  />
                </div>
                <span className={cn('text-xs font-medium transition-all duration-200 mt-1', isActive ? 'text-primary' : 'text-muted-foreground')}>
                  {item.label}
                </span>
              </button>
            );
          })}

          {/* Mais */}
          <button
            onClick={() => setMoreOpen(true)}
            className={cn('nav-item touch-scale flex-1 relative group', moreOpen && 'nav-item-active')}
          >
            <div className={cn(
              'w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200',
              moreOpen ? 'bg-primary/15' : 'group-hover:bg-secondary'
            )}>
              <Menu
                size={22}
                strokeWidth={moreOpen ? 2.5 : 2}
                className={cn('transition-all duration-200', moreOpen && 'drop-shadow-[0_0_10px_hsl(var(--primary))]')}
              />
            </div>
            <span className={cn('text-xs font-medium mt-1', moreOpen ? 'text-primary' : 'text-muted-foreground')}>
              Mais
            </span>
          </button>
        </div>
      </nav>

      <MoreSheet open={moreOpen} onClose={() => setMoreOpen(false)} />
    </>
  );
}
