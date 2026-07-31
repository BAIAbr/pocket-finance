import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Crown, CheckCircle2, XCircle, LogIn, PartyPopper } from 'lucide-react';
import { toast } from 'sonner';

type LookupResult = {
  valid: boolean;
  reason: string;
  code: string;
  internal_name?: string | null;
  description: string | null;
  plan_code: string | null;
  plan_name: string | null;
  duration_days: number | null;
  benefit_type?: string | null;
  discount_percent?: number | null;
  discount_amount?: number | null;
  is_lifetime?: boolean;
};

type RedeemResult = {
  ok: true;
  code: string;
  plan_code: string;
  plan_name: string;
  duration_days: number | null;
  is_lifetime: boolean;
  expires_at: string | null;
} | null;

type RedeemPayload = {
  error?: string;
  retry_after_seconds?: number;
  blocked_until?: string | null;
  block_level?: number;
  remaining_attempts?: number;
};


const REASON_LABEL: Record<string, string> = {
  not_found: 'Código inválido. Verifique se digitou corretamente.',
  inactive: 'Código desativado.',
  archived: 'Este código foi arquivado e não está mais disponível.',
  expired: 'Código expirado.',
  not_started: 'Este código ainda não está disponível. Tente novamente na data de início.',
  max_uses: 'Limite de ativações atingido.',
  already_redeemed: 'Código já utilizado por você.',
  invalid_code_format: 'Código inválido.',
  plan_unavailable: 'O plano deste código não está disponível no momento.',
  rate_limited: 'Muitas tentativas. Aguarde um minuto e tente novamente.',
  subscription_failed: 'Falha ao atualizar sua assinatura.',
  redemption_failed: 'Falha ao registrar a ativação.',
  unauthorized: 'Sessão inválida. Faça login novamente.',
};

const benefitText = (l: LookupResult) => {
  if (l.is_lifetime || l.benefit_type === 'lifetime') return 'Acesso vitalício';
  if (l.benefit_type === 'percent_discount') return `${l.discount_percent}% de desconto`;
  if (l.benefit_type === 'fixed_discount')
    return `${(l.discount_amount ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} de desconto`;
  return `${l.duration_days} dias de Premium`;
};

export default function VipRedeem() {
  const { code = '' } = useParams();
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const [lookup, setLookup] = useState<LookupResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [redeeming, setRedeeming] = useState(false);
  const [redeemed, setRedeemed] = useState<RedeemResult>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('vip-code-info', { body: { code } });
      if (error) {
        setError('Não foi possível consultar o código.');
      } else if ((data as { result?: LookupResult })?.result) {
        setLookup((data as { result: LookupResult }).result);
      } else {
        setLookup({ valid: false, reason: 'not_found', code, description: null, plan_code: null, plan_name: null, duration_days: null });
      }
      setLoading(false);
    })();
  }, [code]);

  const formatWait = (s: number) => {
    if (s >= 3600) {
      const h = Math.round(s / 3600);
      return `${h} hora${h > 1 ? 's' : ''}`;
    }
    if (s >= 60) {
      const m = Math.ceil(s / 60);
      return `${m} minuto${m > 1 ? 's' : ''}`;
    }
    return `${s} segundos`;
  };

  const handleRedeem = async () => {
    if (!user) {
      sessionStorage.setItem('pendingVipCode', code);
      navigate('/auth');
      return;
    }
    setError(null);
    setRedeeming(true);
    const { data, error } = await supabase.functions.invoke('redeem-vip-code', { body: { code } });
    setRedeeming(false);

    let payload = data as RedeemPayload | null;
    if (!payload && error) {
      const ctx = (error as { context?: Response }).context;
      if (ctx && typeof ctx.json === 'function') {
        try { payload = (await ctx.json()) as RedeemPayload; } catch { /* ignore */ }
      }
    }

    if (payload?.error === 'rate_limited') {
      const wait = payload.retry_after_seconds ?? 60;
      setBlockedUntil(payload.blocked_until ?? new Date(Date.now() + wait * 1000).toISOString());
      setSecondsLeft(wait);
      const msg = `Muitas tentativas. Aguarde ${formatWait(wait)} antes de tentar novamente.`;
      toast.error(msg);
      setError(msg);
      return;
    }

    const failure = payload?.error ?? (error ? 'subscription_failed' : null);
    if (failure) {
      const base = REASON_LABEL[failure] || 'Não foi possível ativar este código.';
      const remaining = payload?.remaining_attempts;
      const msg =
        typeof remaining === 'number' && remaining > 0
          ? `${base} Você ainda tem ${remaining} tentativa${remaining > 1 ? 's' : ''} antes do bloqueio temporário.`
          : base;
      toast.error(msg);
      setError(msg);
      return;
    }
    setRedeemed(data as RedeemResult);
    sessionStorage.removeItem('pendingVipCode');
    toast.success('Código aplicado com sucesso!');
  };

  useEffect(() => {
    if (!blockedUntil) return;
    const tick = () => {
      const left = Math.max(0, Math.ceil((new Date(blockedUntil).getTime() - Date.now()) / 1000));
      setSecondsLeft(left);
      if (left === 0) {
        setBlockedUntil(null);
        setError(null);
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [blockedUntil]);

  useEffect(() => {
    if (authLoading || !user || !lookup?.valid || redeemed || redeeming || blockedUntil) return;
    const pending = sessionStorage.getItem('pendingVipCode');
    if (pending && pending.toLowerCase() === code.toLowerCase()) handleRedeem();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user, lookup?.valid]);


  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-primary/5">
      <Card className="w-full max-w-md overflow-hidden">
        <CardContent className="p-6 space-y-5">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center">
              <Crown className="text-primary" size={22} />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg font-semibold">Código VIP</h1>
              <p className="text-xs text-muted-foreground font-mono uppercase truncate">{code}</p>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="animate-spin" size={16} /> Validando código…
            </div>
          ) : redeemed ? (
            <div className="space-y-4 animate-in fade-in zoom-in-95 duration-500">
              <div className="rounded-2xl border border-primary/30 bg-primary/5 p-6 text-center space-y-2">
                <div className="mx-auto h-14 w-14 rounded-full bg-primary/15 flex items-center justify-center animate-in zoom-in duration-700">
                  <PartyPopper className="text-primary" size={28} />
                </div>
                <p className="text-lg font-semibold">🎉 Parabéns!</p>
                <p className="text-sm text-muted-foreground">Você desbloqueou</p>
                <p className="text-2xl font-bold text-primary">
                  {redeemed.is_lifetime ? 'Acesso vitalício' : `${redeemed.duration_days} dias de Premium`}
                </p>
              </div>
              <div className="rounded-lg border p-4 space-y-1 text-sm">
                <div className="flex items-center gap-2 text-green-600 pb-1">
                  <CheckCircle2 size={16} /> <span className="font-medium">Plano {redeemed.plan_name} ativado.</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Validade: </span>
                  <span className="font-medium">
                    {redeemed.expires_at ? new Date(redeemed.expires_at).toLocaleDateString('pt-BR') : 'Sem expiração'}
                  </span>
                </div>
              </div>
              <Button className="w-full" onClick={() => navigate('/')}>Ir para o Dashboard</Button>
            </div>
          ) : lookup?.valid ? (
            <div className="space-y-4">
              <div className="rounded-lg border p-4 space-y-1 text-sm">
                <div><span className="text-muted-foreground">Plano: </span><span className="font-medium">{lookup.plan_name}</span></div>
                <div><span className="text-muted-foreground">Benefício: </span><span className="font-medium">{benefitText(lookup)}</span></div>
                {lookup.description && <p className="text-muted-foreground pt-2">{lookup.description}</p>}
              </div>
              <Button className="w-full" onClick={handleRedeem} disabled={redeeming}>
                {redeeming ? <Loader2 className="animate-spin mr-2" size={16} /> : !user ? <LogIn className="mr-2" size={16} /> : <Crown className="mr-2" size={16} />}
                {!user ? 'Criar conta / entrar para ativar' : 'Ativar benefícios'}
              </Button>
              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-destructive">
                <XCircle size={20} />
                <span className="font-medium">{REASON_LABEL[lookup?.reason || 'not_found']}</span>
              </div>
              <Button variant="outline" className="w-full" asChild>
                <Link to="/">Voltar</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
