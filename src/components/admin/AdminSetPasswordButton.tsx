import { useState } from 'react';
import { KeyRound, Loader2, Check, X, AlertTriangle, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface Props {
  userId: string;
  userEmail: string;
  userName?: string | null;
}

const requirements = [
  { label: 'Min 8', test: (p: string) => p.length >= 8 },
  { label: 'A-Z', test: (p: string) => /[A-Z]/.test(p) },
  { label: 'a-z', test: (p: string) => /[a-z]/.test(p) },
  { label: '0-9', test: (p: string) => /\d/.test(p) },
  { label: '!@#', test: (p: string) => /[!@#$%^&*(),.?":{}|<>]/.test(p) },
];

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function AdminSetPasswordButton({ userId, userEmail, userName }: Props) {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);

  const checks = requirements.map((r) => ({ ...r, ok: r.test(password) }));
  const strong = checks.every((c) => c.ok);
  const match = password.length > 0 && password === confirm;
  const validTarget = UUID_RE.test(userId);

  const reset = () => { setPassword(''); setConfirm(''); setAcknowledged(false); };

  const submit = async () => {
    if (!strong || !match || !validTarget || !acknowledged) return;

    // Hard guard: never allow the admin to silently reset their own password here.
    const { data: sessionData } = await supabase.auth.getUser();
    if (sessionData?.user?.id === userId) {
      toast.error('Este é o seu próprio usuário. Use "Trocar minha senha" no perfil.');
      return;
    }

    setLoading(true);
    try {
      // CRITICAL: We send ONLY the selected row's user_id. Never the session user.
      const payload = { user_id: userId, password };
      const { data, error } = await supabase.functions.invoke('admin-set-password', {
        body: payload,
      });
      if (error || !data?.ok) throw new Error(data?.error || error?.message || 'Falha ao redefinir');
      toast.success(`Senha de ${userName || userEmail} redefinida. Sessões antigas encerradas.`);
      setOpen(false);
      reset();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button
        size="sm"
        variant="ghost"
        className="h-8 gap-1.5 text-xs"
        onClick={(e) => { e.stopPropagation(); reset(); setOpen(true); }}
      >
        <KeyRound className="h-3.5 w-3.5" />
        Redefinir senha
      </Button>

      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-amber-500" />
              Redefinir senha
            </DialogTitle>
            <DialogDescription>
              Esta ação substitui a senha do usuário alvo e encerra todas as sessões dele.
              Sua sessão de administrador não é afetada.
            </DialogDescription>
          </DialogHeader>

          {/* Target identification — explicit and unmistakable */}
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 space-y-1">
            <p className="text-[10px] uppercase tracking-wider text-amber-600 font-semibold">
              Alterando senha de
            </p>
            <p className="text-sm font-semibold text-foreground">
              {userName || '(sem nome)'}
            </p>
            <p className="text-xs text-muted-foreground break-all">{userEmail}</p>
            <p className="text-[10px] font-mono text-muted-foreground break-all">
              ID: {userId}
            </p>
            {!validTarget && (
              <p className="text-[11px] text-destructive flex items-center gap-1 mt-1">
                <AlertTriangle className="h-3 w-3" /> ID de usuário inválido.
              </p>
            )}
          </div>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Nova senha</Label>
              <Input
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                className="text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Confirmar senha</Label>
              <Input
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                disabled={loading}
                className="text-xs"
              />
            </div>

            {password.length > 0 && (
              <div className="flex flex-wrap gap-x-3 gap-y-1">
                {checks.map((c, i) => (
                  <span key={i} className={cn('inline-flex items-center gap-1 text-[10px]', c.ok ? 'text-primary' : 'text-muted-foreground')}>
                    {c.ok ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                    {c.label}
                  </span>
                ))}
                {!match && confirm.length > 0 && (
                  <span className="text-[10px] text-destructive">As senhas não coincidem</span>
                )}
              </div>
            )}

            <label className="flex items-start gap-2 text-[11px] text-muted-foreground cursor-pointer select-none">
              <input
                type="checkbox"
                checked={acknowledged}
                onChange={(e) => setAcknowledged(e.target.checked)}
                disabled={loading}
                className="mt-0.5"
              />
              <span>
                Confirmo que quero redefinir a senha de{' '}
                <strong className="text-foreground">{userName || userEmail}</strong>{' '}
                (ID <span className="font-mono">{userId.slice(0, 8)}…</span>).
              </span>
            </label>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>Cancelar</Button>
            <Button onClick={submit} disabled={loading || !strong || !match || !validTarget || !acknowledged}>
              {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Salvando...</> : 'Confirmar redefinição'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
