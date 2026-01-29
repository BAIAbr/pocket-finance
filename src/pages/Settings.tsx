import { useState } from 'react';
import { useFinanceContext } from '@/contexts/FinanceContext';
import { Moon, DollarSign, Trash2, Info, Github, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function SettingsPage() {
  const { settings, setSettings, clearAllData } = useFinanceContext();
  const [showConfirmClear, setShowConfirmClear] = useState(false);

  const currencies = [
    { code: 'BRL', symbol: 'R$', name: 'Real Brasileiro' },
    { code: 'USD', symbol: '$', name: 'Dólar Americano' },
    { code: 'EUR', symbol: '€', name: 'Euro' },
  ];

  const handleClearData = () => {
    clearAllData();
    setShowConfirmClear(false);
  };

  return (
    <div className="min-h-screen bg-background pb-24 safe-top">
      {/* Header */}
      <header className="px-4 pt-6 pb-4">
        <h1 className="text-2xl font-bold">Configurações</h1>
      </header>

      <main className="px-4 space-y-6">
        {/* Appearance */}
        <section className="card-finance">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <Moon size={18} />
            Aparência
          </h2>
          <div className="flex items-center justify-between py-3">
            <div>
              <p className="font-medium">Tema Escuro</p>
              <p className="text-sm text-muted-foreground">Sempre ativo</p>
            </div>
            <div className="w-12 h-7 rounded-full bg-accent flex items-center justify-end px-1">
              <div className="w-5 h-5 rounded-full bg-white" />
            </div>
          </div>
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
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-3 rounded-xl bg-secondary/50 hover:bg-secondary transition-all touch-scale"
            >
              <div className="flex items-center gap-3">
                <Github size={20} />
                <span>Ver no GitHub</span>
              </div>
              <ExternalLink size={16} className="text-muted-foreground" />
            </a>
          </div>
        </section>

        {/* GitHub Pages Info */}
        <div className="text-center text-xs text-muted-foreground p-4">
          <p>Feito com ❤️ para funcionar no GitHub Pages</p>
          <p className="mt-1">Seus dados ficam salvos localmente no navegador</p>
        </div>
      </main>
    </div>
  );
}
