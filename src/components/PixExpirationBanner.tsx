import { useEffect, useState } from 'react';
import { AlertCircle, Clock, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';

type State =
  | { kind: 'warn'; daysLeft: number }
  | { kind: 'expired' }
  | null;

const DISMISS_KEY = 'pix-banner-dismissed';

export function PixExpirationBanner() {
  const { user } = useAuth();
  const [state, setState] = useState<State>(null);
  const [dismissed, setDismissed] = useState<string | null>(
    typeof window !== 'undefined' ? localStorage.getItem(DISMISS_KEY) : null,
  );

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;

    (async () => {
      const { data } = await supabase
        .from('user_subscriptions')
        .select('plan_code, status, expires_at, metadata, started_at')
        .eq('user_id', user.id)
        .in('status', ['active', 'trial', 'vip'])
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (cancelled || !data) return;

      const meta = (data.metadata ?? {}) as Record<string, unknown>;

      // Recently expired PIX (downgraded to free by cron)
      if (data.plan_code === 'free' && meta.expired_from && meta.pix === false) {
        setState({ kind: 'expired' });
        return;
      }

      // Active PIX approaching expiry
      if (meta.pix === true && data.expires_at) {
        const ms = new Date(data.expires_at).getTime() - Date.now();
        const days = Math.ceil(ms / (24 * 60 * 60 * 1000));
        if (days <= 3 && days >= 0) {
          setState({ kind: 'warn', daysLeft: days });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  if (!state) return null;

  const dismissId =
    state.kind === 'expired' ? 'expired' : `warn-${state.daysLeft}`;
  if (dismissed === dismissId) return null;

  const isExpired = state.kind === 'expired';

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border p-4 shadow-sm animate-fade-in ${
        isExpired
          ? 'bg-destructive/10 border-destructive/30'
          : 'bg-amber-500/10 border-amber-500/30'
      }`}
    >
      <button
        type="button"
        onClick={() => {
          localStorage.setItem(DISMISS_KEY, dismissId);
          setDismissed(dismissId);
        }}
        aria-label="Fechar aviso"
        className="absolute right-2 top-2 rounded-full p-1 text-muted-foreground hover:bg-background/50"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="flex items-start gap-3 pr-6">
        <div
          className={`shrink-0 rounded-full p-2 ${
            isExpired ? 'bg-destructive/20' : 'bg-amber-500/20'
          }`}
        >
          {isExpired ? (
            <AlertCircle className="h-5 w-5 text-destructive" />
          ) : (
            <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm">
            {isExpired
              ? 'Seu Premium via PIX expirou'
              : state.kind === 'warn' && state.daysLeft <= 0
              ? 'Seu Premium expira hoje'
              : `Seu Premium expira em ${state.daysLeft} dia${state.daysLeft === 1 ? '' : 's'}`}
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {isExpired
              ? 'Renove com PIX ou assinatura recorrente para reativar os recursos Premium.'
              : 'Renove agora com PIX ou assine mensal para não perder o acesso.'}
          </p>
          <Button asChild size="sm" className="mt-3 h-8">
            <Link to="/plans">
              {isExpired ? 'Reativar Premium' : 'Renovar agora'}
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
