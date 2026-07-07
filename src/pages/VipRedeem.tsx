import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Crown, CheckCircle2, XCircle, LogIn } from 'lucide-react';
import { toast } from 'sonner';

type LookupResult = {
  valid: boolean;
  reason: string;
  code: string;
  description: string | null;
  plan_code: string | null;
  plan_name: string | null;
  duration_days: number | null;
};

type RedeemResult = {
  ok: true;
  code: string;
  plan_code: string;
  plan_name: string;
  duration_days: number;
  expires_at: string;
} | null;

const REASON_LABEL: Record<string, string> = {
  not_found: 'Código não encontrado.',
  inactive: 'Este código está inativo.',
  expired: 'Este código expirou.',
  max_uses: 'Este código atingiu o limite de usos.',
  already_redeemed: 'Você já ativou este código.',
  invalid_code_format: 'Formato de código inválido.',
  subscription_failed: 'Falha ao atualizar sua assinatura.',
  unauthorized: 'Sessão inválida. Faça login novamente.',
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

  // Public lookup
  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data, error } = await supabase.rpc('get_vip_code_info', { p_code: code });
      if (error) {
        setError('Não foi possível consultar o código.');
      } else if (data && data[0]) {
        setLookup(data[0] as LookupResult);
      } else {
        setLookup({ valid: false, reason: 'not_found', code, description: null, plan_code: null, plan_name: null, duration_days: null });
      }
      setLoading(false);
    })();
  }, [code]);

  const handleRedeem = async () => {
    if (!user) {
      sessionStorage.setItem('pendingVipCode', code);
      navigate('/auth');
      return;
    }
    setRedeeming(true);
    const { data, error } = await supabase.functions.invoke('redeem-vip-code', {
      body: { code },
    });
    setRedeeming(false);
    if (error) {
      // Try to read error body
      const msg = (data as any)?.error || 'subscription_failed';
      toast.error(REASON_LABEL[msg] || 'Falha ao ativar código.');
      setError(REASON_LABEL[msg] || 'Falha ao ativar código.');
      return;
    }
    if ((data as any)?.error) {
      const msg = (data as any).error;
      toast.error(REASON_LABEL[msg] || 'Falha ao ativar código.');
      setError(REASON_LABEL[msg] || 'Falha ao ativar código.');
      return;
    }
    setRedeemed(data as RedeemResult);
    sessionStorage.removeItem('pendingVipCode');
    toast.success('Código ativado!');
  };

  // Auto-redeem if user just logged in with a pending code matching this one
  useEffect(() => {
    if (authLoading || !user || !lookup?.valid || redeemed || redeeming) return;
    const pending = sessionStorage.getItem('pendingVipCode');
    if (pending && pending.toLowerCase() === code.toLowerCase()) {
      handleRedeem();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user, lookup?.valid]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-primary/5">
      <Card className="w-full max-w-md">
        <CardContent className="p-6 space-y-5">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center">
              <Crown className="text-primary" size={22} />
            </div>
            <div>
              <h1 className="text-lg font-semibold">Código VIP</h1>
              <p className="text-xs text-muted-foreground font-mono uppercase">{code}</p>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="animate-spin" size={16} /> Validando código…
            </div>
          ) : redeemed ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle2 size={20} />
                <span className="font-medium">Benefícios liberados!</span>
              </div>
              <div className="rounded-lg border p-4 space-y-1 text-sm">
                <div><span className="text-muted-foreground">Plano ativado: </span><span className="font-medium">{redeemed.plan_name}</span></div>
                <div><span className="text-muted-foreground">Duração: </span><span className="font-medium">{redeemed.duration_days} dias</span></div>
                <div><span className="text-muted-foreground">Expira em: </span><span className="font-medium">{new Date(redeemed.expires_at).toLocaleDateString('pt-BR')}</span></div>
              </div>
              <Button className="w-full" onClick={() => navigate('/')}>Ir para o Dashboard</Button>
            </div>
          ) : lookup?.valid ? (
            <div className="space-y-4">
              <div className="rounded-lg border p-4 space-y-1 text-sm">
                <div><span className="text-muted-foreground">Plano: </span><span className="font-medium">{lookup.plan_name}</span></div>
                <div><span className="text-muted-foreground">Duração: </span><span className="font-medium">{lookup.duration_days} dias</span></div>
                {lookup.description && <p className="text-muted-foreground pt-2">{lookup.description}</p>}
              </div>
              <Button className="w-full" onClick={handleRedeem} disabled={redeeming}>
                {redeeming ? <Loader2 className="animate-spin mr-2" size={16} /> : !user ? <LogIn className="mr-2" size={16} /> : <Crown className="mr-2" size={16} />}
                {!user ? 'Entrar para ativar' : 'Ativar benefícios'}
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
