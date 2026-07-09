import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Search, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { AssetType, fetchQuote } from '@/hooks/useInvestments';
import { CurrencyInput } from '@/components/planning/CurrencyInput';
import { formatBRL } from '@/lib/currency';

interface Props {
  open: boolean;
  onClose: () => void;
  defaultType?: AssetType;
  onCreate: (input: { ticker: string; type: AssetType; name?: string; segment?: string }, initial?: { quantity: number; unit_price: number }) => Promise<void>;
}

const TYPES: { value: AssetType; label: string }[] = [
  { value: 'fii', label: 'FII' },
  { value: 'stock', label: 'Ação' },
  { value: 'etf', label: 'ETF' },
  { value: 'fixed_income', label: 'Renda Fixa' },
];

export function AddAssetModal({ open, onClose, defaultType = 'fii', onCreate }: Props) {
  const [ticker, setTicker] = useState('');
  const [type, setType] = useState<AssetType>(defaultType);
  const [name, setName] = useState('');
  const [segment, setSegment] = useState('');
  const [price, setPrice] = useState(0);
  const [quantity, setQuantity] = useState('');
  const [initialPrice, setInitialPrice] = useState(0);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);

  if (!open) return null;

  const doSearch = async () => {
    const t = ticker.trim().toUpperCase();
    if (!t) return;
    setSearching(true);
    const q = await fetchQuote(t);
    setSearching(false);
    if (!q || !q.price) {
      toast.error('Não foi possível obter dados', { description: 'Tente novamente ou preencha manualmente.' });
      return;
    }
    setName(q.name ?? '');
    setSegment(q.segment ?? '');
    setPrice(q.price);
    setInitialPrice(q.price);
    toast.success(`${t} · ${formatBRL(q.price)}`);
  };

  const submit = async () => {
    const t = ticker.trim().toUpperCase();
    if (!t) return toast.error('Informe o ticker');
    const q = parseFloat(quantity.replace(',', '.')) || 0;
    setSaving(true);
    try {
      await onCreate(
        { ticker: t, type, name: name || undefined, segment: segment || undefined },
        q > 0 && initialPrice > 0 ? { quantity: q, unit_price: initialPrice } : undefined,
      );
      toast.success('Ativo adicionado');
      onClose();
      setTicker(''); setName(''); setSegment(''); setQuantity(''); setPrice(0); setInitialPrice(0);
    } catch (e: any) {
      toast.error('Erro ao adicionar', { description: e.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center bg-black/60 backdrop-blur-sm p-0 lg:p-4" onClick={onClose}>
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-card w-full lg:max-w-md rounded-t-3xl lg:rounded-3xl p-5 max-h-[92vh] overflow-y-auto safe-bottom"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">Adicionar Ativo</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-secondary"><X size={18} /></button>
        </div>

        <div className="grid grid-cols-4 gap-2 mb-4">
          {TYPES.map((t) => (
            <button
              key={t.value}
              onClick={() => setType(t.value)}
              className={`py-2 rounded-xl text-xs font-semibold border transition ${type === t.value ? 'bg-primary text-primary-foreground border-primary' : 'bg-secondary/50 border-border text-muted-foreground'}`}
            >{t.label}</button>
          ))}
        </div>

        <label className="text-xs font-medium text-muted-foreground">Ticker</label>
        <div className="flex gap-2 mt-1 mb-3">
          <input
            value={ticker}
            onChange={(e) => setTicker(e.target.value.toUpperCase())}
            placeholder="Ex: MXRF11"
            className="flex-1 px-3 py-2.5 rounded-xl bg-secondary/50 border border-border text-sm font-semibold uppercase focus:outline-none focus:border-primary"
          />
          <button onClick={doSearch} disabled={searching} className="px-4 py-2 rounded-xl bg-primary text-primary-foreground font-semibold text-sm flex items-center gap-1 disabled:opacity-50">
            {searching ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
            Buscar
          </button>
        </div>

        {price > 0 && (
          <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 mb-3">
            <p className="text-xs text-muted-foreground">Preço atual</p>
            <p className="text-lg font-bold text-primary tabular-nums">{formatBRL(price)}</p>
            {name && <p className="text-xs text-muted-foreground mt-1 truncate">{name}</p>}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Nome</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className="w-full mt-1 px-3 py-2 rounded-xl bg-secondary/50 border border-border text-sm" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Segmento</label>
            <input value={segment} onChange={(e) => setSegment(e.target.value)} className="w-full mt-1 px-3 py-2 rounded-xl bg-secondary/50 border border-border text-sm" />
          </div>
        </div>

        <div className="mt-2 p-3 rounded-xl border border-dashed border-border">
          <p className="text-xs font-semibold mb-2">Aporte inicial (opcional)</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground">Quantidade</label>
              <input
                inputMode="decimal"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="0"
                className="w-full mt-1 px-3 py-2 rounded-xl bg-secondary/50 border border-border text-sm tabular-nums"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Preço unitário</label>
              <CurrencyInput value={initialPrice} onChange={setInitialPrice} />
            </div>
          </div>
        </div>

        <button onClick={submit} disabled={saving || !ticker} className="w-full mt-4 py-3 rounded-xl bg-primary text-primary-foreground font-bold disabled:opacity-50">
          {saving ? 'Salvando...' : 'Adicionar ativo'}
        </button>
      </motion.div>
    </div>
  );
}
