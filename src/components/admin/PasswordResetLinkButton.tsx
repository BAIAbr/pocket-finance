import { useEffect, useState } from 'react';
import { KeyRound, Loader2, Copy, Check, ExternalLink, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { getAppUrl } from '@/lib/appUrl';

interface Props {
  email: string;
  name?: string | null;
}

export function PasswordResetLinkButton({ email, name }: Props) {
  const [open, setOpen] = useState(false);
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

  const generate = async () => {
    setLoading(true);
    setLink(null);
    setExpiresAt(null);
    try {
      const { data, error } = await supabase.functions.invoke('admin-generate-recovery-link', {
        body: { email, redirectTo: getAppUrl('reset-password') },
      });
      if (error) throw error;
      if (!data?.action_link) throw new Error('Resposta vazia');
      setLink(data.action_link as string);
      if (data.expires_at) setExpiresAt(new Date(data.expires_at as string));
    } catch (e) {
      toast.error((e as Error).message || 'Falha ao gerar link');
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
    if (!expiresAt) return '';
    if (expired) return 'Expirado';
    const totalSec = Math.floor(remainingMs / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m}m ${String(s).padStart(2, '0')}s`;
  })();
  const expiresLabel = expiresAt
    ? expiresAt.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'medium' })
    : '';

  return (
    <>
      <Button
        size="sm"
        variant="ghost"
        className="h-8 gap-1.5 text-xs"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
          setLink(null);
          setExpiresAt(null);
        }}
      >
        <KeyRound className="h-3.5 w-3.5" />
        Redefinir senha
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Gerar link de redefinição</DialogTitle>
            <DialogDescription>
              Gere um link único para {name || email} redefinir a senha. Copie e envie
              pelo canal de sua preferência — não é necessário esperar pelo e-mail.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">E-mail</Label>
              <Input value={email} disabled className="text-xs" />
            </div>

            {link && (
              <div className="space-y-1.5">
                <Label className="text-xs">Link de redefinição</Label>
                <div className="rounded-md border bg-muted/40 p-2 text-[11px] break-all max-h-32 overflow-y-auto">
                  {link}
                </div>
                {expiresAt && (
                  <div
                    className={`flex items-center justify-between gap-2 rounded-md border px-2 py-1.5 text-[11px] ${
                      expired
                        ? 'border-destructive/40 bg-destructive/10 text-destructive'
                        : 'border-border bg-muted/40 text-muted-foreground'
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" />
                      {expired ? 'Link expirado' : `Expira em ${remainingLabel}`}
                    </span>
                    <span className="font-mono">{expiresLabel}</span>
                  </div>
                )}
                <p className="text-[10px] text-muted-foreground">
                  Compartilhe apenas com a pessoa correta. Após expirar, gere um novo link.
                </p>
              </div>
            )}
          </div>


          <DialogFooter className="flex-col sm:flex-row gap-2">
            {!link ? (
              <Button onClick={generate} disabled={loading} className="w-full sm:w-auto">
                {loading ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Gerando...</>
                ) : (
                  <><KeyRound className="h-4 w-4 mr-2" /> Gerar link</>
                )}
              </Button>
            ) : (
              <>
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
