import { useState } from 'react';
import { Bell, ArrowRight, CheckCheck, Calendar, Target, Trophy, Crown, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useNotifications, type AppNotification } from '@/hooks/useNotifications';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const iconMap = {
  bill_due: Calendar,
  goal_deadline: Target,
  piggy_completed: Trophy,
  pix_expiring: Crown,
  insight: Sparkles,
  system: Bell,
} as const;

const priorityRing = {
  high: 'bg-red-500/15 text-red-500 ring-red-500/30',
  medium: 'bg-amber-500/15 text-amber-500 ring-amber-500/30',
  low: 'bg-primary/15 text-primary ring-primary/30',
} as const;

interface Props {
  variant?: 'icon' | 'menu-item';
  className?: string;
}

export function NotificationCenter({ variant = 'icon', className }: Props) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { notifications, unreadCount, isRead, markAsRead, markAllAsRead } = useNotifications();

  const openItem = (n: AppNotification) => {
    markAsRead(n.id);
    if (n.href) {
      setOpen(false);
      navigate(n.href);
    }
  };

  const relative = (iso: string) => {
    try {
      return formatDistanceToNow(parseISO(iso), { addSuffix: true, locale: ptBR });
    } catch {
      return '';
    }
  };

  const trigger = variant === 'icon' ? (
    <button
      onClick={() => setOpen(true)}
      className={cn(
        'relative w-10 h-10 rounded-xl bg-secondary/70 hover:bg-secondary text-foreground flex items-center justify-center transition-all',
        className
      )}
      aria-label="Notificações"
    >
      <Bell size={18} />
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-background">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </button>
  ) : (
    <button
      onClick={() => setOpen(true)}
      className={cn(
        'w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-all',
        className
      )}
    >
      <div className="relative">
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-red-500" />
        )}
      </div>
      <span>Notificações</span>
      {unreadCount > 0 && (
        <Badge variant="secondary" className="ml-auto">{unreadCount}</Badge>
      )}
    </button>
  );

  return (
    <>
      {trigger}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col">
          <SheetHeader className="px-5 py-4 border-b border-border/50">
            <div className="flex items-center justify-between">
              <SheetTitle className="text-base">Notificações</SheetTitle>
              {notifications.length > 0 && unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 gap-1.5 text-xs"
                  onClick={markAllAsRead}
                >
                  <CheckCheck size={14} />
                  Marcar todas
                </Button>
              )}
            </div>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full px-6 py-12 text-center">
                <div className="w-16 h-16 rounded-2xl bg-secondary/60 flex items-center justify-center mb-4">
                  <Bell className="text-muted-foreground" size={28} />
                </div>
                <p className="text-sm font-medium text-foreground">Tudo em dia</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-[240px]">
                  Você não tem alertas pendentes. Voltamos aqui quando algo importante surgir.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-border/40">
                {notifications.map(n => {
                  const Icon = iconMap[n.type] || Bell;
                  const read = isRead(n.id);
                  return (
                    <li key={n.id}>
                      <button
                        onClick={() => openItem(n)}
                        className={cn(
                          'w-full text-left px-5 py-3.5 flex gap-3 items-start transition-colors hover:bg-secondary/40',
                          !read && 'bg-primary/[0.03]'
                        )}
                      >
                        <div
                          className={cn(
                            'w-9 h-9 rounded-xl flex items-center justify-center ring-1 shrink-0',
                            priorityRing[n.priority]
                          )}
                        >
                          <Icon size={16} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start gap-2">
                            <p
                              className={cn(
                                'text-sm leading-snug',
                                !read ? 'font-semibold text-foreground' : 'text-foreground/85'
                              )}
                            >
                              {n.title}
                            </p>
                            {!read && (
                              <span className="mt-1.5 w-2 h-2 rounded-full bg-primary shrink-0" />
                            )}
                          </div>
                          {n.description && (
                            <p className="text-xs text-muted-foreground mt-0.5 truncate">
                              {n.description}
                            </p>
                          )}
                          <p className="text-[10px] uppercase tracking-wide text-muted-foreground mt-1.5">
                            {relative(n.timestamp)}
                          </p>
                        </div>
                        {n.href && (
                          <ArrowRight size={14} className="text-muted-foreground mt-3 shrink-0" />
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
