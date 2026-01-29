import { useState } from 'react';
import { useFinanceContext } from '@/contexts/FinanceContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Moon, Sun, DollarSign, Trash2, Info, LogOut, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function SettingsPage() {
  const { settings, setSettings, clearAllData } = useFinanceContext();
  const { theme, toggleTheme } = useTheme();
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const [showConfirmClear, setShowConfirmClear] = useState(false);

  const currencies = [
    { code: 'BRL', symbol: 'R$', name: 'Real Brasileiro' },
    { code: 'USD', symbol: '$', name: 'Dólar Americano' },
    { code: 'EUR', symbol: '€', name: 'Euro' },
  ];

  const handleClearData = () => {
    clearAllData();
    setShowConfirmClear(false);
    toast.success('Dados limpos com sucesso');
  };

  const handleLogout = () => {
    logout();
    toast.success('Até logo!');
    navigate('/auth');
  };

  return (
    <div className="min-h-screen bg-background pb-24 safe-top">
      {/* Header */}
      <header className="px-4 pt-6 pb-4">
        <h1 className="text-2xl font-bold">Configurações</h1>
      </header>

      <main className="px-4 space-y-6">
        {/* User Section */}
        <section className="card-finance">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <User size={18} />
            Conta
          </h2>
          {isAuthenticated && user ? (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl gradient-balance flex items-center justify-center text-white font-bold text-xl">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold">{user.name}</p>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-secondary/50 hover:bg-secondary transition-all touch-scale text-destructive"
              >
                <span>Sair da conta</span>
                <LogOut size={18} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => navigate('/auth')}
              className="w-full py-3 rounded-xl gradient-balance text-white font-medium touch-scale"
            >
              Entrar ou criar conta
            </button>
          )}
        </section>

        {/* Appearance */}
        <section className="card-finance">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            {theme === 'dark' ? <Moon size={18} /> : <Sun size={18} />}
            Aparência
          </h2>
          <button
            onClick={toggleTheme}
            className="w-full flex items-center justify-between py-3"
          >
            <div>
              <p className="font-medium">Tema {theme === 'dark' ? 'Escuro' : 'Claro'}</p>
              <p className="text-sm text-muted-foreground">
                Toque para alternar
              </p>
            </div>
            <div 
              className={cn(
                'w-14 h-8 rounded-full flex items-center px-1 transition-all duration-300',
                theme === 'dark' ? 'bg-accent justify-end' : 'bg-secondary justify-start'
              )}
            >
              <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center shadow-md transition-all duration-300">
                {theme === 'dark' ? (
                  <Moon size={14} className="text-accent" />
                ) : (
                  <Sun size={14} className="text-warning" />
                )}
              </div>
            </div>
          </button>
        </section>

        {/* Currency */}
        <section className="card-finance">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <DollarSign size={18} />
            Moeda
          </h2>
          <div className="space-y-2">
            {currencies.map(currency => (
              <button
                key={currency.code}
                onClick={() => setSettings({ ...settings, currency: currency.code, currencySymbol: currency.symbol })}
                className={cn(
                  'w-full flex items-center justify-between p-3 rounded-xl transition-all touch-scale',
                  settings.currency === currency.code 
                    ? 'bg-accent/20 ring-1 ring-accent' 
                    : 'bg-secondary/50 hover:bg-secondary'
                )}
              >
                <div className="flex items-center gap-3">
                  <span className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center font-mono font-bold">
                    {currency.symbol}
                  </span>
                  <div className="text-left">
                    <p className="font-medium">{currency.name}</p>
                    <p className="text-xs text-muted-foreground">{currency.code}</p>
                  </div>
                </div>
                {settings.currency === currency.code && (
                  <div className="w-5 h-5 rounded-full bg-accent flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-white" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </section>

        {/* Data */}
        <section className="card-finance">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <Trash2 size={18} />
            Dados
          </h2>
          {showConfirmClear ? (
            <div className="space-y-3">
              <p className="text-sm text-destructive">
                ⚠️ Isso apagará todas as suas transações e categorias personalizadas. Esta ação não pode ser desfeita.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowConfirmClear(false)}
                  className="flex-1 py-3 rounded-xl bg-secondary font-medium touch-scale"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleClearData}
                  className="flex-1 py-3 rounded-xl bg-destructive text-destructive-foreground font-medium touch-scale"
                >
                  Confirmar
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowConfirmClear(true)}
              className="w-full flex items-center justify-between p-3 rounded-xl bg-secondary/50 hover:bg-secondary transition-all touch-scale text-destructive"
            >
              <span>Limpar todos os dados</span>
              <Trash2 size={18} />
            </button>
          )}
        </section>

        {/* About */}
        <section className="card-finance">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <Info size={18} />
            Sobre
          </h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2">
              <span className="text-muted-foreground">Versão</span>
              <span className="font-mono">1.0.0</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-muted-foreground">Armazenamento</span>
              <span className="font-mono">LocalStorage</span>
            </div>
          </div>
        </section>

        {/* Footer */}
        <div className="text-center text-xs text-muted-foreground p-4">
          <p>FINANGO © 2025</p>
          <p className="mt-1">Seus dados ficam salvos localmente no navegador</p>
        </div>
      </main>
    </div>
  );
}
