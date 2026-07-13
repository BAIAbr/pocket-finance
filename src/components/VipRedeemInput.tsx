import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Crown, Ticket, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

export function VipRedeemInput() {
  const navigate = useNavigate();
  const [code, setCode] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = code.trim();
    if (!trimmed) return;
    if (!/^[A-Za-z0-9_-]{3,32}$/.test(trimmed)) {
      toast.error('Código inválido. Use 3-32 letras, números, _ ou -.');
      return;
    }
    navigate(`/vip/${trimmed.toUpperCase()}`);
  };

  return (
    <section className="card-finance">
      <h2 className="font-semibold mb-1 flex items-center gap-2">
        <Crown size={18} className="text-primary" />
        Tem um código VIP? <span className="text-xs font-normal text-muted-foreground">(opcional)</span>
      </h2>
      <p className="text-xs text-muted-foreground mb-3">
        Alternativa gratuita ao pagamento — se você recebeu um código promocional, ative aqui.
      </p>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <div className="relative flex-1">
          <Ticket size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="EX: BLACKFRIDAY"
            className="w-full h-11 pl-9 pr-3 rounded-xl bg-secondary/60 border border-border/40 font-mono uppercase text-sm outline-none focus:ring-2 focus:ring-primary/40"
            maxLength={32}
          />
        </div>
        <button
          type="submit"
          disabled={!code.trim()}
          className="h-11 px-4 rounded-xl bg-primary text-primary-foreground font-medium touch-scale disabled:opacity-50 flex items-center gap-1"
        >
          Ativar <ArrowRight size={16} />
        </button>
      </form>
    </section>
  );
}
