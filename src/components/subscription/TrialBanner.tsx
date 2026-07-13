import { useEffect, useState } from 'react';
import { Clock, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/hooks/useSubscription';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

export function TrialBanner() {
  const { user } = useAuth();
  const { subscription, loading } = useSubscription(user?.id);
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setDismissed(sessionStorage.getItem('trial_banner_dismissed') === '1');
  }, []);

  if (loading || dismissed || !subscription?.trial) return null;
  const endsAt = (subscription as any).trial_ends_at ?? subscription.expires_at;
  if (!endsAt) return null;

  const daysLeft = Math.max(0, Math.ceil((new Date(endsAt).getTime() - Date.now()) / 86_400_000));
  if (daysLeft <= 0) return null;

  const urgent = daysLeft <= 3;

  return (
    <div
      className={cn(
        'relative rounded-2xl p-4 border overflow-hidden',
        urgent
          ? 'border-warning/40 bg-gradient-to-br from-warning/15 via-warning/5 to-transparent'
          : 'border-primary/30 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent',
      )}
    >
      <button
        onClick={() => {
          sessionStorage.setItem('trial_banner_dismissed', '1');
          setDismissed(true);
        }}
        className="absolute top-2 right-2 p-1 rounded-full hover:bg-background/40 text-muted-foreground"
        aria-label="Fechar"
      >
        <X size={14} />
      </button>
      <div className="flex items-start gap-3 pr-6">
        <div
          className={cn(
            'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
            urgent ? 'bg-warning/20 text-warning' : 'bg-primary/20 text-primary',
          )}
        >
          <Clock size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-sm">
            {urgent
              ? `Seu período gratuito termina em ${daysLeft} ${daysLeft === 1 ? 'dia' : 'dias'}`
              : `Você está no período gratuito — ${daysLeft} dias restantes`}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Assine agora para não perder o acesso aos recursos Premium.
          </p>
          <button
            onClick={() => navigate('/plans')}
            className="mt-2 text-xs font-semibold text-primary hover:underline"
          >
            Escolher plano →
          </button>
        </div>
      </div>
    </div>
  );
}
