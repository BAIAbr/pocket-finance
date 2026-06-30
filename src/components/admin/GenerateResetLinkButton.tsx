import { useEffect, useState } from 'react';
import { Link2, Loader2, Copy, Check, ExternalLink, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface Props {
  userId?: string;
  userEmail?: string;
  userName?: string | null;
  /** When true, render as full-width outline trigger for the global button. */
  freeEmail?: boolean;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function GenerateResetLinkButton({ userId, userEmail, userName, freeEmail = false }: Props) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState(userEmail ?? '');
  const [loading, setLoading] = useState(false);
  const [link, setLink] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [now, setNow] = useState<Date>(new Date());
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!expiresAt) return;
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  const reset = () => {
    setLink(null); setExpiresAt(null);
    setEmail(userEmail ?? '');
  };

  const generate = async () => {
    setLoading(true); setLink(null); setExpiresAt(null);
    try {
      const body: Record<string, unknown> = {
        baseUrl: 'https://finango.online',
      };
      if (userId) body.user_id = userId;
      else {
        const target = email.trim().toLowerCase();
        if (!EMAIL_RE.test(target)) { toast.error('Informe um e-mail válido'); setLoading(false); return; }
        body.email = target;
      }
      const { data, error } = await supabase.functions.invoke('admin-create-reset-token', { body });
      if (error || !data?.action_link) throw new Error(data?.error || error?.message || 'Falha ao gerar');
      setLink(data.action_link as string);
      if (data.expires_at) setExpiresAt(new Date(data.expires_at as string));
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const copy = async () => {
    if (!link) return;
    await navigator.clipboard.writeText(link);
    setCopied(true);
    toast.success('Link copiado!');
    setTimeout(() => setCopied(false), 2000);
  };

  const remainingMs = expiresAt ? expiresAt.getTime() - now.getTime() : 0;
  const expired = expiresAt ? remainingMs <= 0 : false;
  const remainingLabel = (() => {
    if (!expiresAt || expired) return 'Expirado';
    const totalSec = Math.floor(remainingMs / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m}m ${String(s).padStart(2, '0')}s`;
  })();
  const expiresLabel = expiresAt ? expiresAt.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'medium' }) : '';

  return (
    <>
      <Button
        size="sm"
        variant={freeEmail ? 'outline' : 'ghost'}
        className="h-8 gap-1.5 text-xs"
        onClick={(e) => { e.stopPropagation(); reset(); setOpen(true); }}
      >
        <Link2 className="h-3.5 w-3.5" />
        {freeEmail ? 'Gerar link para qualquer e-mail' : 'Gerar link'}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Gerar link de redefinição</DialogTitle>
            <DialogDescription>
              {userId
                ? `Crie um link de uso único para ${userName || userEmail} redefinir a senha. Copie e envie pelo canal de sua preferência — nenhum e-mail é disparado.`
                : 'Informe o e-mail do usuário. O link é único, válido por 30 minutos e nenhum e-mail é enviado.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {!userId && (
              <div className="space-y-1.5">
                <Label className="text-xs" htmlFor="gen-email">E-mail</Label>
                <Input
                  id="gen-email"
                  type="email"
                  value={email}
                  disabled={loading}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="usuario@exemplo.com"
                  className="text-xs"
                  autoComplete="off"
                />
              </div>
            )}

            {link && (
              <div className="space-y-1.5">
                <Label className="text-xs">Link único</Label>
                <div className="rounded-md border bg-muted/40 p-2 text-[11px] break-all max-h-32 overflow-y-auto">{link}</div>
                {expiresAt && (
                  <div className={`flex items-center justify-between gap-2 rounded-md border px-2 py-1.5 text-[11px] ${
                    expired ? 'border-destructive/40 bg-destructive/10 text-destructive' : 'border-border bg-muted/40 text-muted-foreground'
                  }`}>
                    <span className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" />
                      {expired ? 'Link expirado' : `Expira em ${remainingLabel}`}
                    </span>
                    <span className="font-mono">{expiresLabel}</span>
                  </div>
                )}
                <p className="text-[10px] text-muted-foreground">
                  Uso único. Compartilhe apenas com a pessoa correta.
                </p>
              </div>
            )}
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            {!link ? (
              <Button onClick={generate} disabled={loading || (!userId && !EMAIL_RE.test(email.trim()))} className="w-full sm:w-auto">
                {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Gerando...</> : <><Link2 className="h-4 w-4 mr-2" /> Gerar link</>}
              </Button>
            ) : (
              <>
                <Button variant="outline" onClick={reset} className="w-full sm:w-auto">Gerar outro</Button>
                <Button variant="outline" onClick={copy} className="w-full sm:w-auto">
                  {copied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
                  {copied ? 'Copiado' : 'Copiar link'}
                </Button>
                <Button asChild className="w-full sm:w-auto">
                  <a href={link} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4 mr-2" /> Abrir
                  </a>
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
