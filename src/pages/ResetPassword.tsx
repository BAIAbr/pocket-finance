import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Loader2, Check, X } from 'lucide-react';
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

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Supabase JS auto-detects recovery tokens in the URL and emits PASSWORD_RECOVERY
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
        setReady(true);
      }
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  const validation = useMemo(() => requirements.map(r => ({ ...r, valid: r.test(password) })), [password]);
  const isValid = validation.every(r => r.valid);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) { toast.error('A senha não atende todos os requisitos'); return; }
    if (password !== confirm) { toast.error('As senhas não coincidem'); return; }
    setIsLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setIsLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Senha redefinida com sucesso!');
    await supabase.auth.signOut();
    navigate('/auth');
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
            {ready ? 'Crie uma nova senha para sua conta' : 'Validando link de recuperação...'}
          </p>
        </div>

        {ready && (
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
              disabled={isLoading || !isValid || password !== confirm}
              className={cn(
                'w-full h-11 rounded-lg font-semibold text-primary-foreground text-sm shadow-lg transition-all',
                'bg-primary hover:bg-primary/90 active:scale-[0.98]',
                (isLoading || !isValid || password !== confirm) && 'opacity-70 cursor-not-allowed'
              )}
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Redefinir senha'}
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
