import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// Capybara mascot SVG component for login
function LoginCapyMascot() {
  return (
    <svg viewBox="0 0 200 180" className="w-full h-full">
      {/* Coins and piggy bank elements */}
      <g>
        {/* Coins stack left */}
        <ellipse cx="35" cy="155" rx="18" ry="6" fill="#FFD700" />
        <ellipse cx="35" cy="150" rx="18" ry="6" fill="#FFC107" />
        <ellipse cx="35" cy="145" rx="18" ry="6" fill="#FFD700" />
        <ellipse cx="35" cy="140" rx="18" ry="6" fill="#FFEB3B" />
        
        {/* Coins stack right */}
        <ellipse cx="165" cy="158" rx="15" ry="5" fill="#FFD700" />
        <ellipse cx="165" cy="153" rx="15" ry="5" fill="#FFC107" />
        <ellipse cx="165" cy="148" rx="15" ry="5" fill="#FFD700" />
        
        {/* Single coins */}
        <circle cx="55" cy="160" r="8" fill="#FFD700" />
        <circle cx="145" cy="162" r="6" fill="#FFC107" />
        
        {/* Piggy bank */}
        <ellipse cx="155" cy="130" rx="22" ry="18" fill="#FFB6C1" />
        <ellipse cx="160" cy="120" rx="8" ry="6" fill="#FFB6C1" />
        <circle cx="162" cy="118" r="2" fill="#333" />
        <ellipse cx="155" cy="145" rx="5" ry="4" fill="#FF69B4" />
        <ellipse cx="165" cy="145" rx="5" ry="4" fill="#FF69B4" />
        <rect x="148" y="108" width="14" height="4" rx="2" fill="#FF69B4" />
      </g>
      
      {/* Grass/ground */}
      <ellipse cx="100" cy="175" rx="90" ry="15" fill="#4CAF50" opacity="0.3" />
      
      {/* Capybara body */}
      <ellipse cx="100" cy="135" rx="45" ry="35" fill="#8B7355" />
      
      {/* Capybara head */}
      <ellipse cx="100" cy="85" rx="35" ry="30" fill="#A0896C" />
      
      {/* Snout */}
      <ellipse cx="100" cy="100" rx="20" ry="14" fill="#C4A882" />
      
      {/* Nose */}
      <ellipse cx="100" cy="95" rx="8" ry="5" fill="#4A3728" />
      <ellipse cx="98" cy="94" rx="2" ry="1" fill="#6B5344" />
      
      {/* Eyes */}
      <ellipse cx="85" cy="78" rx="6" ry="7" fill="#1a1a1a" />
      <ellipse cx="115" cy="78" rx="6" ry="7" fill="#1a1a1a" />
      <circle cx="86" cy="76" r="2" fill="white" />
      <circle cx="116" cy="76" r="2" fill="white" />
      
      {/* Eyebrows (friendly) */}
      <path d="M78 70 Q85 67 92 70" stroke="#5D4E37" strokeWidth="2" fill="none" />
      <path d="M108 70 Q115 67 122 70" stroke="#5D4E37" strokeWidth="2" fill="none" />
      
      {/* Ears */}
      <ellipse cx="70" cy="60" rx="8" ry="6" fill="#A0896C" />
      <ellipse cx="130" cy="60" rx="8" ry="6" fill="#A0896C" />
      <ellipse cx="70" cy="60" rx="5" ry="3" fill="#C4A882" />
      <ellipse cx="130" cy="60" rx="5" ry="3" fill="#C4A882" />
      
      {/* Smile */}
      <path d="M88 105 Q100 115 112 105" stroke="#4A3728" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      
      {/* Cheek blush */}
      <ellipse cx="72" cy="92" rx="8" ry="5" fill="#E8A090" opacity="0.5" />
      <ellipse cx="128" cy="92" rx="8" ry="5" fill="#E8A090" opacity="0.5" />
      
      {/* Arms/paws waving */}
      <ellipse cx="55" cy="115" rx="12" ry="18" fill="#8B7355" transform="rotate(-20 55 115)" />
      <ellipse cx="145" cy="120" rx="12" ry="18" fill="#8B7355" transform="rotate(15 145 120)" />
      
      {/* Paw details */}
      <ellipse cx="48" cy="105" rx="6" ry="5" fill="#C4A882" transform="rotate(-20 48 105)" />
      <ellipse cx="152" cy="112" rx="6" ry="5" fill="#C4A882" transform="rotate(15 152 112)" />
      
      {/* Legs */}
      <ellipse cx="75" cy="165" rx="12" ry="8" fill="#8B7355" />
      <ellipse cx="125" cy="165" rx="12" ry="8" fill="#8B7355" />
      
      {/* Money in hand */}
      <g transform="rotate(-15 50 100)">
        <rect x="40" y="95" width="25" height="12" rx="2" fill="#85BB65" />
        <text x="52" y="104" fontSize="8" fill="#2E7D32" textAnchor="middle" fontWeight="bold">$</text>
      </g>
      
      {/* Sparkles */}
      <g fill="#FFD700">
        <path d="M25 50 L27 55 L32 57 L27 59 L25 64 L23 59 L18 57 L23 55 Z" />
        <path d="M170 45 L171 48 L174 49 L171 50 L170 53 L169 50 L166 49 L169 48 Z" />
        <path d="M60 35 L61 38 L64 39 L61 40 L60 43 L59 40 L56 39 L59 38 Z" />
        <path d="M140 30 L141 32 L143 33 L141 34 L140 36 L139 34 L137 33 L139 32 Z" />
      </g>
    </svg>
  );
}

// Leaf decoration component
function LeafDecoration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cn("w-6 h-6", className)} fill="#4CAF50">
      <path d="M17,8C8,10 5.9,16.17 3.82,21.34L5.71,22L6.66,19.7C7.14,19.87 7.64,20 8,20C19,20 22,3 22,3C21,5 14,5.25 9,6.25C4,7.25 2,11.5 2,13.5C2,15.5 3.75,17.25 3.75,17.25C7,8 17,8 17,8Z" />
    </svg>
  );
}

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
        <div className="absolute top-8 left-1/2 -translate-x-1/2 -translate-y-2">
          <LeafDecoration />
        </div>
        
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
      <div className="flex-1 flex items-end justify-center pb-0 px-4 min-h-[180px]">
        <div className="w-full max-w-xs">
          <LoginCapyMascot />
        </div>
      </div>
    </div>
  );
}
