import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import capyMascot from '@/assets/capy-login-mascot.jpeg';

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const { signIn, signUp, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Redirect if already authenticated
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
    <div className="min-h-screen flex flex-col relative overflow-x-hidden">
      {/* Hero Image Section - Full width background */}
      <div 
        className="relative w-full flex-shrink-0"
        style={{ height: '50vh', minHeight: '320px' }}
      >
        {/* Hero background image */}
        <img 
          src={capyMascot} 
          alt="Fin, a capivara mascote do Finango" 
          className="absolute inset-0 w-full h-full object-cover object-top"
        />
        
        {/* Gradient overlay at bottom for smooth transition */}
        <div 
          className="absolute bottom-0 left-0 right-0 h-24 pointer-events-none"
          style={{ 
            background: 'linear-gradient(to top, rgb(209 250 229) 0%, transparent 100%)' 
          }}
        />
        
        {/* Decorative sparkles on hero */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-16 left-8 w-2 h-2 bg-amber-300/80 rounded-full animate-pulse" />
          <div className="absolute top-24 right-12 w-1.5 h-1.5 bg-amber-400/80 rounded-full animate-pulse" style={{ animationDelay: '0.1s' }} />
          <div className="absolute top-32 left-1/4 w-1 h-1 bg-amber-300/70 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
          <div className="absolute top-20 right-1/3 w-2 h-2 bg-amber-200/80 rounded-full animate-pulse" style={{ animationDelay: '0.3s' }} />
        </div>
      </div>

      {/* Content section with form */}
      <div className="flex-1 flex flex-col px-6 pb-8 bg-gradient-to-b from-emerald-100 to-emerald-200 -mt-4 relative z-10">
        {/* Text section */}
        <div className="text-center mb-5 pt-2">
          <h1 className="text-2xl font-bold text-emerald-800 leading-tight">
            Entre para cuidar<br />do seu dinheiro
          </h1>
          <p className="text-emerald-600/90 text-sm mt-2">
            Sem complicação. Sem burocracia.
          </p>
        </div>

        {/* Form section */}
        <form onSubmit={handleSubmit} className="space-y-3 max-w-sm mx-auto w-full">
          {/* Name field (only for signup) */}
          {!isLogin && (
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500">
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Nome"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full h-12 pl-12 pr-4 rounded-xl bg-white/95 border border-emerald-200 shadow-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition-all"
              />
            </div>
          )}

          {/* Email field */}
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500" size={20} />
            <input
              type="email"
              placeholder="E-mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full h-12 pl-12 pr-4 rounded-xl bg-white/95 border border-emerald-200 shadow-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition-all"
            />
          </div>

          {/* Password field */}
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500" size={20} />
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full h-12 pl-12 pr-4 rounded-xl bg-white/95 border border-emerald-200 shadow-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition-all"
            />
          </div>

          {/* Submit button */}
          <button
            type="submit"
            disabled={isLoading}
            className={cn(
              'w-full h-12 rounded-xl font-semibold text-white text-base shadow-lg transition-all mt-2',
              'bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 active:scale-[0.98]',
              isLoading && 'opacity-70 cursor-not-allowed'
            )}
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin mx-auto" />
            ) : (
              isLogin ? 'Entrar' : 'Criar Conta'
            )}
          </button>
        </form>

        {/* Links */}
        <div className="text-center mt-4 space-y-2">
          <button
            type="button"
            onClick={() => setIsLogin(!isLogin)}
            className="text-emerald-700 font-medium text-sm hover:underline"
          >
            {isLogin ? 'Criar conta' : 'Já tenho conta'}
          </button>
          
          <div>
            <button
              type="button"
              onClick={() => toast.info('Recurso em desenvolvimento')}
              className="text-emerald-600/80 text-xs hover:underline"
            >
              Esqueci minha senha
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
