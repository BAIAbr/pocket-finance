import { useState } from 'react';
import { KeyRound, Loader2, Check, X } from 'lucide-react';
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

export function AdminSetPasswordButton({ userId, userEmail, userName }: Props) {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  const checks = requirements.map((r) => ({ ...r, ok: r.test(password) }));
  const strong = checks.every((c) => c.ok);
  const match = password.length > 0 && password === confirm;

  const reset = () => { setPassword(''); setConfirm(''); };

  const submit = async () => {
    if (!strong || !match) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-set-password', {
        body: { user_id: userId, password },
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
            <DialogTitle>Redefinir senha</DialogTitle>
            <DialogDescription>
              Defina uma nova senha para <span className="font-medium">{userName || userEmail}</span>.
              As sessões ativas serão encerradas.
            </DialogDescription>
          </DialogHeader>

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
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>Cancelar</Button>
            <Button onClick={submit} disabled={loading || !strong || !match}>
              {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Salvando...</> : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
