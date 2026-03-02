import { useState } from 'react';
import { PiggyBank, ChevronDown, ArrowUpRight, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface PiggyBankItem {
  id: string;
  name: string;
  balance: number;
  color: string;
  target_amount: number | null;
}

interface QuickPiggyDepositProps {
  piggyBanks: PiggyBankItem[];
  formatCurrency: (amount: number) => string;
  onDeposit: (piggyId: string, amount: number, description?: string) => Promise<void>;
}

export function QuickPiggyDeposit({ piggyBanks, formatCurrency, onDeposit }: QuickPiggyDepositProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const selected = piggyBanks.find(p => p.id === selectedId);

  if (piggyBanks.length === 0) return null;

  const handleSubmit = async () => {
    if (!selectedId || !amount || Number(amount) <= 0) {
      toast.error('Selecione um cofrinho e informe o valor');
      return;
    }

    setIsSubmitting(true);
    try {
      await onDeposit(selectedId, Number(amount), 'Depósito rápido');
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        setAmount('');
      }, 1500);
    } catch {
      toast.error('Erro ao depositar');
    } finally {
      setIsSubmitting(false);
    }
  };

  const quickAmounts = [10, 50, 100, 500];

  return (
    <div className="card-finance space-y-3">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
          <PiggyBank size={18} className="text-accent" />
        </div>
        <div>
          <h3 className="font-semibold text-sm">Depósito Rápido</h3>
          <p className="text-xs text-muted-foreground">Adicione dinheiro ao cofrinho</p>
        </div>
      </div>

      {/* Piggy bank selector */}
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-secondary/60 border border-border text-sm transition-colors hover:bg-secondary"
        >
          {selected ? (
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: selected.color }}
              />
              <span className="font-medium">{selected.name}</span>
              <span className="text-muted-foreground text-xs">
                ({formatCurrency(Number(selected.balance))})
              </span>
            </div>
          ) : (
            <span className="text-muted-foreground">Selecione um cofrinho</span>
          )}
          <ChevronDown size={16} className={cn("text-muted-foreground transition-transform", isOpen && "rotate-180")} />
        </button>

        {isOpen && (
          <div className="absolute z-10 mt-1 w-full bg-card border border-border rounded-xl shadow-lg overflow-hidden">
            {piggyBanks.map(piggy => (
              <button
                key={piggy.id}
                onClick={() => {
                  setSelectedId(piggy.id);
                  setIsOpen(false);
                }}
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-2.5 text-sm text-left transition-colors hover:bg-secondary/60",
                  selectedId === piggy.id && "bg-accent/10"
                )}
              >
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: piggy.color }}
                />
                <span className="font-medium flex-1 truncate">{piggy.name}</span>
                <span className="text-muted-foreground text-xs">
                  {formatCurrency(Number(piggy.balance))}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Amount input */}
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">R$</span>
        <input
          type="number"
          inputMode="decimal"
          placeholder="0,00"
          value={amount}
          onChange={e => setAmount(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-secondary/60 border border-border text-sm font-mono focus:outline-none focus:ring-2 focus:ring-accent/30"
        />
      </div>

      {/* Quick amounts */}
      <div className="flex gap-2">
        {quickAmounts.map(qa => (
          <button
            key={qa}
            onClick={() => setAmount(String(qa))}
            className={cn(
              "flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors border",
              amount === String(qa)
                ? "bg-accent text-accent-foreground border-accent"
                : "bg-secondary/40 text-muted-foreground border-border hover:bg-secondary"
            )}
          >
            R${qa}
          </button>
        ))}
      </div>

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={!selectedId || !amount || Number(amount) <= 0 || isSubmitting}
        className={cn(
          "w-full py-2.5 rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition-all",
          showSuccess
            ? "bg-income text-white"
            : "gradient-balance text-white disabled:opacity-40 disabled:cursor-not-allowed touch-scale"
        )}
      >
        {showSuccess ? (
          <>
            <Check size={16} />
            Depositado!
          </>
        ) : isSubmitting ? (
          'Depositando...'
        ) : (
          <>
            <ArrowUpRight size={16} />
            Depositar
          </>
        )}
      </button>
    </div>
  );
}
