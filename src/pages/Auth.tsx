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
    <div className="min-h-screen flex flex-col relative overflow-hidden" style={{ background: 'linear-gradient(180deg, #E8F5E9 0%, #C8E6C9 50%, #A5D6A7 100%)' }}>
      {/* Decorative sparkles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-10 left-10 w-2 h-2 bg-yellow-300 rounded-full animate-pulse" />
        <div className="absolute top-20 right-16 w-1.5 h-1.5 bg-yellow-400 rounded-full animate-pulse delay-100" />
        <div className="absolute top-32 left-1/4 w-1 h-1 bg-yellow-300 rounded-full animate-pulse delay-200" />
        <div className="absolute top-16 right-1/3 w-2 h-2 bg-yellow-200 rounded-full animate-pulse delay-300" />
        <div className="absolute top-40 right-10 w-1.5 h-1.5 bg-yellow-300 rounded-full animate-pulse delay-150" />
      </div>

      {/* Header with logo */}
      <div className="flex-shrink-0 pt-12 pb-4 px-6 text-center relative">
        <h1 className="text-4xl font-bold text-green-800 tracking-tight" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
          Finango
        </h1>
        
        <h2 className="text-xl font-semibold text-green-700 mt-3 leading-tight">
          Entre para cuidar<br />do seu dinheiro
        </h2>
        
        <p className="text-green-600/80 text-sm mt-2">
          Sem complicação. Sem burocracia.
        </p>
      </div>

      {/* Form section */}
      <div className="flex-shrink-0 px-6 py-6">
        <form onSubmit={handleSubmit} className="space-y-4 max-w-sm mx-auto">
          {/* Name field (only for signup) */}
          {!isLogin && (
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
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
                className="w-full h-14 pl-12 pr-4 rounded-2xl bg-white/90 border-0 shadow-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-green-400"
              />
            </div>
          )}

          {/* Email field */}
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="email"
              placeholder="E-mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full h-14 pl-12 pr-4 rounded-2xl bg-white/90 border-0 shadow-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-green-400"
            />
          </div>

          {/* Password field */}
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full h-14 pl-12 pr-4 rounded-2xl bg-white/90 border-0 shadow-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-green-400"
            />
          </div>

          {/* Submit button */}
          <button
            type="submit"
            disabled={isLoading}
            className={cn(
              'w-full h-14 rounded-2xl font-semibold text-white text-lg shadow-lg transition-all',
              'bg-green-600 hover:bg-green-700 active:scale-[0.98]',
              isLoading && 'opacity-70 cursor-not-allowed'
            )}
          >
            {isLoading ? (
              <Loader2 className="w-6 h-6 animate-spin mx-auto" />
            ) : (
              isLogin ? 'Entrar' : 'Criar Conta'
            )}
          </button>
        </form>

        {/* Links */}
        <div className="text-center mt-4 space-y-2">
          <button
            type="button"
            onClick={() => toast.info('Recurso em desenvolvimento')}
            className="text-green-700 text-sm hover:underline"
          >
            Esqueci minha senha
          </button>
          
          <div>
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-green-800 font-medium text-sm hover:underline"
            >
              {isLogin ? 'Criar conta' : 'Já tenho conta'}
            </button>
          </div>
        </div>
      </div>

      {/* Mascot section - grows to fill remaining space */}
      <div className="flex-1 flex items-end justify-center pb-0 px-4 min-h-[200px]">
        <img 
          src={capyMascot} 
          alt="Fin, a capivara mascote do Finango" 
          className="w-full max-w-[280px] h-auto object-contain"
        />
      </div>
    </div>
  );
}
