import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Loader2, Check, X, ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';

const requirements = [
  { label: 'Mínimo 8 caracteres', test: (p: string) => p.length >= 8 },
  { label: 'Letra maiúscula', test: (p: string) => /[A-Z]/.test(p) },
  { label: 'Letra minúscula', test: (p: string) => /[a-z]/.test(p) },
  { label: 'Número', test: (p: string) => /\d/.test(p) },
  { label: 'Caractere especial', test: (p: string) => /[!@#$%^&*(),.?":{}|<>]/.test(p) },
];

export default function RedefinirSenhaPage() {
  const [token, setToken] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);
  const [valid, setValid] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // HashRouter: ?token=... lives inside location.hash
    const hash = window.location.hash;
    const qIdx = hash.indexOf('?');
    const search = qIdx >= 0 ? hash.slice(qIdx) : window.location.search;
    const t = new URLSearchParams(search).get('token');

    if (!t) { setError('Este link é inválido ou expirou.'); setChecking(false); return; }
    setToken(t);

    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke('consume-reset-token', {
          body: { token: t },
        });
        if (error || !data?.ok) {
          setError(data?.error || 'Este link é inválido ou expirou.');
        } else {
          setValid(true);
        }
      } catch (e) {
        setError('Não foi possível validar o link.');
      } finally {
        setChecking(false);
      }
    })();
  }, []);

  const validation = useMemo(() => requirements.map(r => ({ ...r, valid: r.test(password) })), [password]);
  const isValid = validation.every(r => r.valid);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    if (!isValid) { toast.error('A senha não atende todos os requisitos'); return; }
    if (password !== confirm) { toast.error('As senhas não coincidem'); return; }
    setSubmitting(true);
    try {
      // Sign out any existing session first so the new password takes effect
      // cleanly when the user logs back in.
      await supabase.auth.signOut().catch(() => {});

      const { data, error } = await supabase.functions.invoke('consume-reset-token', {
        body: { token, password },
      });
      if (error || !data?.ok) {
        toast.error(data?.error || error?.message || 'Não foi possível redefinir a senha.');
        setSubmitting(false);
        return;
      }
      toast.success('Senha redefinida com sucesso!');
      navigate('/auth');
    } catch (err) {
      toast.error((err as Error).message || 'Erro inesperado');
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background/80 backdrop-blur-md p-4">
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-sm bg-card/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-border/50 p-6 space-y-5"
      >
        <div className="text-center">
          <h2 className="text-2xl font-black tracking-tight text-primary">FINANGO</h2>
          <h1 className="text-xl font-bold text-foreground mt-3">Redefinir senha</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {checking ? 'Validando link...' : valid ? 'Crie uma nova senha para sua conta' : 'Link de redefinição'}
          </p>
        </div>

        {checking && (
          <div className="flex justify-center py-6">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        )}

        {!checking && error && (
          <div className="space-y-3">
            <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-destructive text-sm">
              <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Solicite um novo link ao administrador.
            </p>
          </div>
        )}

        {!checking && valid && (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
              <input
                type="password"
                placeholder="Nova senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full h-11 pl-10 pr-4 rounded-lg bg-muted/50 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm"
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
              <input
                type="password"
                placeholder="Confirmar nova senha"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                className="w-full h-11 pl-10 pr-4 rounded-lg bg-muted/50 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm"
              />
            </div>

            {password.length > 0 && (
              <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                {validation.map((req, i) => (
                  <div key={i} className={cn('flex items-center gap-1.5 text-xs', req.valid ? 'text-primary' : 'text-muted-foreground')}>
                    {req.valid ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                    <span>{req.label}</span>
                  </div>
                ))}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || !isValid || password !== confirm}
              className={cn(
                'w-full h-11 rounded-lg font-semibold text-primary-foreground text-sm shadow-lg transition-all',
                'bg-primary hover:bg-primary/90 active:scale-[0.98]',
                (submitting || !isValid || password !== confirm) && 'opacity-70 cursor-not-allowed'
              )}
            >
              {submitting ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Redefinir senha'}
            </button>
          </form>
        )}

        <div className="text-center">
          <button type="button" onClick={() => navigate('/auth')} className="text-muted-foreground text-xs hover:underline">
            Voltar para login
          </button>
        </div>
      </motion.div>
    </div>
  );
}
