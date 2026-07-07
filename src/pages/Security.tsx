import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSecurityEvents } from '@/hooks/useSecurityEvents';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Shield, ShieldCheck, ShieldAlert, LogOut, Loader2, Smartphone, KeyRound, Clock, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function SecurityPage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { events, sessions, loading, logEvent, reload } = useSecurityEvents(user?.id);

  const [mfaLoading, setMfaLoading] = useState(true);
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [enrollingMfa, setEnrollingMfa] = useState(false);
  const [enrollData, setEnrollData] = useState<{ factorId: string; qr: string; secret: string } | null>(null);
  const [otpCode, setOtpCode] = useState('');
  const [verifying, setVerifying] = useState(false);

  const loadMfa = async () => {
    setMfaLoading(true);
    const { data } = await supabase.auth.mfa.listFactors();
    const totp = data?.totp?.find((f) => f.status === 'verified');
    setMfaEnabled(!!totp);
    setMfaLoading(false);
  };

  useEffect(() => {
    loadMfa();
  }, []);

  const startEnroll = async () => {
    setEnrollingMfa(true);
    try {
      const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: `Finango ${Date.now()}` });
      if (error) throw error;
      setEnrollData({ factorId: data.id, qr: data.totp.qr_code, secret: data.totp.secret });
    } catch (e: any) {
      toast.error(e.message ?? 'Erro ao iniciar 2FA');
      setEnrollingMfa(false);
    }
  };

  const verifyEnroll = async () => {
    if (!enrollData || otpCode.length !== 6) return;
    setVerifying(true);
    try {
      const { data: chall, error: cErr } = await supabase.auth.mfa.challenge({ factorId: enrollData.factorId });
      if (cErr) throw cErr;
      const { error: vErr } = await supabase.auth.mfa.verify({
        factorId: enrollData.factorId,
        challengeId: chall.id,
        code: otpCode,
      });
      if (vErr) throw vErr;
      toast.success('2FA ativado com sucesso!');
      await logEvent('mfa_enabled');
      setEnrollingMfa(false);
      setEnrollData(null);
      setOtpCode('');
      await loadMfa();
    } catch (e: any) {
      toast.error(e.message ?? 'Código inválido');
    } finally {
      setVerifying(false);
    }
  };

  const disableMfa = async () => {
    if (!confirm('Desativar autenticação de dois fatores?')) return;
    const { data } = await supabase.auth.mfa.listFactors();
    const totp = data?.totp?.find((f) => f.status === 'verified');
    if (!totp) return;
    const { error } = await supabase.auth.mfa.unenroll({ factorId: totp.id });
    if (error) {
      toast.error(error.message);
      return;
    }
    await logEvent('mfa_disabled');
    toast.success('2FA desativado');
    await loadMfa();
  };

  const signOutEverywhere = async () => {
    if (!confirm('Encerrar sessão em todos os dispositivos?')) return;
    try {
      await supabase.auth.signOut({ scope: 'others' });
      await logEvent('signout_all_others');
      toast.success('Outras sessões encerradas');
    } catch (e: any) {
      toast.error(e.message ?? 'Erro');
    }
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  const eventLabel = (type: string) => {
    const map: Record<string, string> = {
      mfa_enabled: '2FA ativado',
      mfa_disabled: '2FA desativado',
      signout_all_others: 'Sessões remotas encerradas',
      password_changed: 'Senha alterada',
      login: 'Login realizado',
    };
    return map[type] ?? type;
  };

  return (
    <div className="min-h-screen bg-background pb-24 lg:pb-8">
      <div className="max-w-3xl mx-auto px-4 lg:px-8 pt-6 space-y-6">
        <button
          onClick={() => navigate('/settings')}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft size={16} /> Voltar
        </button>

        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="text-primary" /> Segurança da conta
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Proteja sua conta com 2FA e revise atividades recentes.
          </p>
        </div>

        {/* 2FA */}
        <div className="p-5 rounded-2xl bg-card border border-border">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="flex items-start gap-3">
              <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', mfaEnabled ? 'bg-green-500/15 text-green-500' : 'bg-secondary')}>
                {mfaEnabled ? <ShieldCheck size={20} /> : <ShieldAlert size={20} />}
              </div>
              <div>
                <h3 className="font-semibold">Autenticação em 2 fatores (2FA)</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {mfaEnabled ? 'Ativa — use seu app autenticador ao entrar.' : 'Adicione uma camada extra usando um app autenticador.'}
                </p>
              </div>
            </div>
            {mfaLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : mfaEnabled ? (
              <button onClick={disableMfa} className="text-xs text-destructive font-medium">
                Desativar
              </button>
            ) : !enrollingMfa ? (
              <button onClick={startEnroll} className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold">
                Ativar
              </button>
            ) : null}
          </div>

          {enrollingMfa && enrollData && (
            <div className="border-t border-border pt-4 space-y-3">
              <p className="text-sm">1. Escaneie o QR Code no Google Authenticator, Authy ou 1Password:</p>
              <div className="flex justify-center bg-white p-3 rounded-lg">
                <img src={enrollData.qr} alt="QR Code" className="w-40 h-40" />
              </div>
              <p className="text-xs text-muted-foreground text-center">
                Ou digite manualmente: <code className="text-foreground bg-secondary px-1.5 py-0.5 rounded">{enrollData.secret}</code>
              </p>
              <p className="text-sm">2. Insira o código de 6 dígitos:</p>
              <input
                inputMode="numeric"
                maxLength={6}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                className="w-full text-center text-2xl tracking-widest font-mono py-3 rounded-lg bg-secondary border border-border"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setEnrollingMfa(false);
                    setEnrollData(null);
                    setOtpCode('');
                  }}
                  className="flex-1 py-2 rounded-lg bg-secondary text-sm font-medium"
                >
                  Cancelar
                </button>
                <button
                  onClick={verifyEnroll}
                  disabled={otpCode.length !== 6 || verifying}
                  className="flex-1 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50"
                >
                  {verifying ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Confirmar'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Sessions */}
        <div className="p-5 rounded-2xl bg-card border border-border">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Smartphone size={18} className="text-primary" /> Sessões recentes
            </h3>
            <button
              onClick={signOutEverywhere}
              className="text-xs text-destructive font-medium flex items-center gap-1"
            >
              <LogOut size={12} /> Encerrar outras
            </button>
          </div>
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin mx-auto" />
          ) : sessions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhuma sessão registrada.</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {sessions.map((s) => (
                <div key={s.id} className="flex items-center justify-between p-2.5 rounded-lg bg-secondary/50 text-sm">
                  <div className="flex items-center gap-2">
                    <Clock size={14} className="text-muted-foreground" />
                    <div>
                      <div className="font-medium">{formatDate(s.login_at)}</div>
                      <div className="text-xs text-muted-foreground">
                        {s.logout_at ? `Duração: ${s.duration_minutes?.toFixed(0) ?? '—'} min` : 'Ativa / sem logout registrado'}
                      </div>
                    </div>
                  </div>
                  {!s.logout_at && (
                    <span className="text-[10px] font-semibold text-green-500 bg-green-500/10 px-2 py-0.5 rounded-full">
                      Ativa
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Security events */}
        <div className="p-5 rounded-2xl bg-card border border-border">
          <h3 className="font-semibold flex items-center gap-2 mb-4">
            <KeyRound size={18} className="text-primary" /> Histórico de segurança
          </h3>
          {events.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4 flex items-center justify-center gap-2">
              <AlertCircle size={14} /> Nenhum evento registrado ainda.
            </p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {events.map((e) => (
                <div key={e.id} className="flex items-center justify-between p-2.5 rounded-lg bg-secondary/50 text-sm">
                  <span className="font-medium">{eventLabel(e.event_type)}</span>
                  <span className="text-xs text-muted-foreground">{formatDate(e.created_at)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
