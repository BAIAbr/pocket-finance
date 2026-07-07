import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, Loader2, User, Check, X, ShieldCheck, Sparkle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

interface PasswordRequirement {
  label: string;
  validator: (password: string) => boolean;
}

const passwordRequirements: PasswordRequirement[] = [
  { label: 'Mínimo 8 caracteres', validator: (p) => p.length >= 8 },
  { label: 'Letra maiúscula', validator: (p) => /[A-Z]/.test(p) },
  { label: 'Letra minúscula', validator: (p) => /[a-z]/.test(p) },
  { label: 'Número', validator: (p) => /\d/.test(p) },
  { label: 'Caractere especial (!@#$%)', validator: (p) => /[!@#$%^&*(),.?":{}|<>]/.test(p) },
];

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showRequirements, setShowRequirements] = useState(false);

  const { signIn, signUp, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const passwordValidation = useMemo(
    () => passwordRequirements.map((req) => ({ ...req, valid: req.validator(password) })),
    [password]
  );

  const isPasswordValid = useMemo(
    () => passwordValidation.every((req) => req.valid),
    [passwordValidation]
  );

  const passwordStrength = useMemo(() => {
    const validCount = passwordValidation.filter((req) => req.valid).length;
    return Math.round((validCount / passwordRequirements.length) * 100);
  }, [passwordValidation]);

  useEffect(() => {
    if (isAuthenticated) navigate('/');
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) {
          if (error.message.includes('Invalid login credentials')) toast.error('Email ou senha incorretos');
          else toast.error(error.message);
        } else {
          toast.success('Bem-vindo de volta!');
          navigate('/');
        }
      } else {
        if (!name.trim()) { toast.error('Informe seu nome'); setIsLoading(false); return; }
        if (!isPasswordValid) { toast.error('A senha não atende todos os requisitos'); setIsLoading(false); return; }
        const { error } = await signUp(email, password, name);
        if (error) {
          if (error.message.includes('already registered')) toast.error('Este email já está cadastrado');
          else toast.error(error.message);
        } else {
          toast.success('Conta criada com sucesso!');
          navigate('/');
        }
      }
    } catch {
      toast.error('Algo deu errado. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-background text-foreground">
      {/* Ambient background — orange bloom over near-black */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 dark:opacity-100 opacity-40"
        style={{
          background:
            'radial-gradient(60% 50% at 15% 20%, hsl(25 100% 50% / 0.22) 0%, transparent 60%),' +
            'radial-gradient(50% 45% at 85% 90%, hsl(25 100% 55% / 0.18) 0%, transparent 65%),' +
            'radial-gradient(80% 80% at 50% 50%, transparent 40%, hsl(0 0% 0% / 0.4) 100%)',
        }}
      />
      {/* Grid pattern overlay */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.04] dark:opacity-[0.06]"
        style={{
          backgroundImage:
            'linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
          maskImage: 'radial-gradient(ellipse at center, black 40%, transparent 75%)',
        }}
      />

      <div className="relative min-h-screen w-full flex flex-col lg:flex-row">
        {/* LEFT — brand panel (desktop only) */}
        <div className="hidden lg:flex flex-col justify-between w-[46%] p-12 relative">
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="flex items-center gap-3"
          >
            <div className="w-11 h-11 rounded-2xl bg-primary flex items-center justify-center shadow-glow-accent">
              <Sparkle className="w-6 h-6 text-primary-foreground" strokeWidth={2.5} />
            </div>
            <span className="text-2xl font-black tracking-tight">FINANGO</span>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="space-y-6 max-w-md"
          >
            <h1 className="text-5xl font-black leading-[1.05] tracking-tight">
              Suas finanças,{' '}
              <span className="text-primary">com clareza</span>
              <br />
              e controle.
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed">
              A plataforma completa para organizar receitas, despesas, cofrinhos e metas —
              com inteligência artificial e visão de família.
            </p>

            <div className="flex flex-wrap gap-2 pt-2">
              {['Cofrinhos', 'Modo família', 'IA financeira', 'Metas'].map((tag) => (
                <span
                  key={tag}
                  className="text-xs font-medium px-3 py-1.5 rounded-full bg-secondary text-secondary-foreground border border-border"
                >
                  {tag}
                </span>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="flex items-center gap-2 text-sm text-muted-foreground"
          >
            <ShieldCheck className="w-4 h-4 text-primary" />
            Dados criptografados · LGPD compliant
          </motion.div>
        </div>

        {/* RIGHT — auth card */}
        <div className="flex-1 flex items-center justify-center p-4 sm:p-8">
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-md"
          >
            {/* Halo behind card */}
            <div
              aria-hidden
              className="absolute -inset-px rounded-3xl opacity-70"
              style={{
                background:
                  'linear-gradient(135deg, hsl(25 100% 50% / 0.35), transparent 40%, hsl(25 100% 50% / 0.15) 100%)',
                filter: 'blur(24px)',
              }}
            />

            <div className="relative rounded-3xl border border-border/70 bg-card/80 backdrop-blur-2xl shadow-2xl p-7 sm:p-9 space-y-6">
              {/* Mobile logo */}
              <div className="flex items-center justify-center gap-2 lg:hidden">
                <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shadow-glow-accent">
                  <Sparkle className="w-5 h-5 text-primary-foreground" strokeWidth={2.5} />
                </div>
                <span className="text-xl font-black tracking-tight">FINANGO</span>
              </div>

              {/* Segmented toggle */}
              <div className="relative grid grid-cols-2 p-1 rounded-xl bg-muted/60 border border-border/70">
                <motion.div
                  layout
                  transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                  className="absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-lg bg-card shadow-md"
                  style={{ left: isLogin ? 4 : 'calc(50% + 0px)' }}
                />
                <button
                  type="button"
                  onClick={() => setIsLogin(true)}
                  className={cn(
                    'relative z-10 h-9 text-sm font-semibold transition-colors',
                    isLogin ? 'text-foreground' : 'text-muted-foreground'
                  )}
                >
                  Entrar
                </button>
                <button
                  type="button"
                  onClick={() => setIsLogin(false)}
                  className={cn(
                    'relative z-10 h-9 text-sm font-semibold transition-colors',
                    !isLogin ? 'text-foreground' : 'text-muted-foreground'
                  )}
                >
                  Criar conta
                </button>
              </div>

              {/* Header */}
              <div className="space-y-1">
                <h2 className="text-2xl font-bold tracking-tight">
                  {isLogin ? 'Bem-vindo de volta' : 'Comece agora'}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {isLogin
                    ? 'Acesse sua conta para continuar.'
                    : 'Crie sua conta e organize suas finanças.'}
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <AnimatePresence initial={false}>
                  {!isLogin && (
                    <motion.div
                      key="name"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.25 }}
                    >
                      <FieldInput
                        icon={<User size={18} />}
                        type="text"
                        placeholder="Nome completo"
                        value={name}
                        onChange={(v) => setName(v)}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>

                <FieldInput
                  icon={<Mail size={18} />}
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={setEmail}
                  required
                  autoComplete="email"
                />

                <div className="space-y-3">
                  <FieldInput
                    icon={<Lock size={18} />}
                    type="password"
                    placeholder="Senha"
                    value={password}
                    onChange={setPassword}
                    required
                    autoComplete={isLogin ? 'current-password' : 'new-password'}
                    onFocus={() => !isLogin && setShowRequirements(true)}
                    onBlur={() => setTimeout(() => setShowRequirements(false), 200)}
                  />

                  {!isLogin && (showRequirements || password.length > 0) && (
                    <motion.div
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-2"
                    >
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                          <motion.div
                            layout
                            className={cn(
                              'h-full rounded-full transition-colors',
                              passwordStrength < 40 && 'bg-destructive',
                              passwordStrength >= 40 && passwordStrength < 80 && 'bg-amber-500',
                              passwordStrength >= 80 && 'bg-primary'
                            )}
                            style={{ width: `${passwordStrength}%` }}
                          />
                        </div>
                        <span
                          className={cn(
                            'text-xs font-semibold',
                            passwordStrength < 40 && 'text-destructive',
                            passwordStrength >= 40 && passwordStrength < 80 && 'text-amber-500',
                            passwordStrength >= 80 && 'text-primary'
                          )}
                        >
                          {passwordStrength < 40 && 'Fraca'}
                          {passwordStrength >= 40 && passwordStrength < 80 && 'Média'}
                          {passwordStrength >= 80 && 'Forte'}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
                        {passwordValidation.map((req, i) => (
                          <div
                            key={i}
                            className={cn(
                              'flex items-center gap-1.5 text-[11px] transition-colors',
                              req.valid ? 'text-primary' : 'text-muted-foreground'
                            )}
                          >
                            {req.valid ? <Check className="w-3 h-3 shrink-0" /> : <X className="w-3 h-3 shrink-0" />}
                            <span>{req.label}</span>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </div>

                <motion.button
                  type="submit"
                  disabled={isLoading || (!isLogin && !isPasswordValid && password.length > 0)}
                  whileTap={{ scale: 0.98 }}
                  className={cn(
                    'group relative w-full h-12 rounded-xl font-semibold text-sm text-primary-foreground',
                    'bg-primary hover:brightness-110 transition-all',
                    'shadow-glow-accent',
                    (isLoading || (!isLogin && !isPasswordValid && password.length > 0)) &&
                      'opacity-60 cursor-not-allowed'
                  )}
                >
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    {isLoading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>{isLogin ? 'Entrar' : 'Criar conta'}</>
                    )}
                  </span>
                </motion.button>
              </form>

              {isLogin && (
                <p className="text-center text-xs text-muted-foreground leading-relaxed">
                  Esqueceu a senha? Solicite ao administrador um link de redefinição.
                </p>
              )}

              <div className="pt-2 text-center text-[11px] text-muted-foreground">
                Ao continuar, você concorda com os Termos e a Política de Privacidade.
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

/* ---------- helpers ---------- */

interface FieldInputProps {
  icon: React.ReactNode;
  type: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  autoComplete?: string;
  onFocus?: () => void;
  onBlur?: () => void;
}

function FieldInput({
  icon,
  type,
  placeholder,
  value,
  onChange,
  required,
  autoComplete,
  onFocus,
  onBlur,
}: FieldInputProps) {
  return (
    <div className="group relative">
      <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors">
        {icon}
      </div>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        autoComplete={autoComplete}
        onFocus={onFocus}
        onBlur={onBlur}
        className={cn(
          'w-full h-12 pl-11 pr-4 rounded-xl text-sm',
          'bg-muted/60 border border-border text-foreground placeholder:text-muted-foreground',
          'focus:outline-none focus:border-primary focus:bg-background',
          'focus:ring-4 focus:ring-primary/15 transition-all'
        )}
      />
    </div>
  );
}
