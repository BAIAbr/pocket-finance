import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, Loader2, User, Check, X } from 'lucide-react';
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

  const passwordValidation = useMemo(() => {
    return passwordRequirements.map((req) => ({
      ...req,
      valid: req.validator(password),
    }));
  }, [password]);

  const isPasswordValid = useMemo(() => {
    return passwordValidation.every((req) => req.valid);
  }, [passwordValidation]);

  const passwordStrength = useMemo(() => {
    const validCount = passwordValidation.filter((req) => req.valid).length;
    return Math.round((validCount / passwordRequirements.length) * 100);
  }, [passwordValidation]);

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) {
          if (error.message.includes('Invalid login credentials')) {
            toast.error('Email ou senha incorretos');
          } else {
            toast.error(error.message);
          }
        } else {
          toast.success('Bem-vindo de volta!');
          navigate('/');
        }
      } else {
        if (!name.trim()) {
          toast.error('Informe seu nome');
          setIsLoading(false);
          return;
        }
        if (!isPasswordValid) {
          toast.error('A senha não atende todos os requisitos');
          setIsLoading(false);
          return;
        }
        const { error } = await signUp(email, password, name);
        if (error) {
          if (error.message.includes('already registered')) {
            toast.error('Este email já está cadastrado');
          } else {
            toast.error(error.message);
          }
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
    <div className="min-h-screen flex items-center justify-center bg-background/80 backdrop-blur-md p-4">
      {/* Auth Card */}
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{
          duration: 0.5,
          ease: [0.16, 1, 0.3, 1],
        }}
        className="relative w-full max-w-sm bg-card/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-border/50 p-6 space-y-5"
      >
        {/* Logo */}
        <div className="text-center mb-2">
          <h2 className="text-2xl font-black tracking-tight text-primary">
            FINANGO
          </h2>
        </div>

        {/* Header */}
        <div className="text-center">
          <h1 className="text-xl font-bold text-foreground">
            {isLogin ? 'Entrar' : 'Criar conta'}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {isLogin ? 'Acesse sua conta' : 'Comece a organizar suas finanças'}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Name field (signup only) */}
          {!isLogin && (
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
              <input
                type="text"
                placeholder="Nome"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full h-11 pl-10 pr-4 rounded-lg bg-muted/50 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-sm"
              />
            </div>
          )}

          {/* Email field */}
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
            <input
              type="email"
              placeholder="E-mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full h-11 pl-10 pr-4 rounded-lg bg-muted/50 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-sm"
            />
          </div>

          {/* Password field */}
          <div className="space-y-2">
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
              <input
                type="password"
                placeholder="Senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={() => !isLogin && setShowRequirements(true)}
                onBlur={() => setTimeout(() => setShowRequirements(false), 200)}
                required
                className="w-full h-11 pl-10 pr-4 rounded-lg bg-muted/50 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-sm"
              />
            </div>

            {/* Password strength indicator and requirements (signup only) */}
            {!isLogin && (showRequirements || password.length > 0) && (
              <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
                {/* Strength bar */}
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className={cn(
                        'h-full transition-all duration-300 rounded-full',
                        passwordStrength < 40 && 'bg-destructive',
                        passwordStrength >= 40 && passwordStrength < 80 && 'bg-amber-500',
                        passwordStrength >= 80 && 'bg-primary'
                      )}
                      style={{ width: `${passwordStrength}%` }}
                    />
                  </div>
                  <span className={cn(
                    'text-xs font-medium',
                    passwordStrength < 40 && 'text-destructive',
                    passwordStrength >= 40 && passwordStrength < 80 && 'text-amber-500',
                    passwordStrength >= 80 && 'text-primary'
                  )}>
                    {passwordStrength < 40 && 'Fraca'}
                    {passwordStrength >= 40 && passwordStrength < 80 && 'Média'}
                    {passwordStrength >= 80 && 'Forte'}
                  </span>
                </div>

                {/* Requirements list */}
                <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                  {passwordValidation.map((req, index) => (
                    <div
                      key={index}
                      className={cn(
                        'flex items-center gap-1.5 text-xs transition-colors',
                        req.valid ? 'text-primary' : 'text-muted-foreground'
                      )}
                    >
                      {req.valid ? (
                        <Check className="w-3 h-3 flex-shrink-0" />
                      ) : (
                        <X className="w-3 h-3 flex-shrink-0" />
                      )}
                      <span>{req.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Submit button */}
          <button
            type="submit"
            disabled={isLoading || (!isLogin && !isPasswordValid && password.length > 0)}
            className={cn(
              'w-full h-11 rounded-lg font-semibold text-primary-foreground text-sm shadow-lg transition-all',
              'bg-primary hover:bg-primary/90 active:scale-[0.98]',
              (isLoading || (!isLogin && !isPasswordValid && password.length > 0)) && 'opacity-70 cursor-not-allowed'
            )}
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin mx-auto" />
            ) : (
              isLogin ? 'Entrar' : 'Criar Conta'
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-card px-2 text-muted-foreground">ou</span>
          </div>
        </div>

        {/* Toggle link */}
        <div className="text-center">
          <button
            type="button"
            onClick={() => setIsLogin(!isLogin)}
            className="text-primary font-medium text-sm hover:underline"
          >
            {isLogin ? 'Criar uma conta' : 'Já tenho conta'}
          </button>
        </div>

        {/* Forgot password */}
        {isLogin && (
          <div className="text-center">
            <button
              type="button"
              onClick={() => toast.info('Recurso em desenvolvimento')}
              className="text-muted-foreground text-xs hover:underline"
            >
              Esqueci minha senha
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
