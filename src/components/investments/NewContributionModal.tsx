import { useState } from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { toast } from 'sonner';
import { CurrencyInput } from '@/components/planning/CurrencyInput';
import { InvestmentAsset } from '@/hooks/useInvestments';

interface Props {
  open: boolean;
  onClose: () => void;
  assets: InvestmentAsset[];
  currentPrice?: (ticker: string) => number | null;
  onSubmit: (input: { asset_id: string; quantity: number; unit_price: number; date?: string }) => Promise<void>;
  preselectedAssetId?: string;
}

export function NewContributionModal({ open, onClose, assets, currentPrice, onSubmit, preselectedAssetId }: Props) {
  const [assetId, setAssetId] = useState(preselectedAssetId ?? assets[0]?.id ?? '');
  const [mode, setMode] = useState<'qty' | 'value'>('qty');
  const [quantity, setQuantity] = useState('');
  const [totalValue, setTotalValue] = useState(0);
  const [price, setPrice] = useState(0);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);

  if (!open) return null;

  const selected = assets.find((a) => a.id === assetId);
  const suggestion = selected && currentPrice ? currentPrice(selected.ticker) : null;

  const computedQty = mode === 'value' && price > 0 ? Math.floor(totalValue / price) : 0;
  const computedRemaining = mode === 'value' && price > 0 ? totalValue - computedQty * price : 0;

  const submit = async () => {
    const q = mode === 'qty' ? (parseFloat(quantity.replace(',', '.')) || 0) : computedQty;
    if (!assetId || q <= 0 || price <= 0) return toast.error('Preencha todos os campos');
    setSaving(true);
    try {
      await onSubmit({ asset_id: assetId, quantity: q, unit_price: price, date });
      toast.success('Aporte registrado');
      onClose();
      setQuantity(''); setPrice(0); setTotalValue(0);
    } catch (e: any) {
      toast.error('Erro', { description: e.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <motion.div
        initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-card w-full lg:max-w-md rounded-t-3xl lg:rounded-3xl p-5 max-h-[92vh] overflow-y-auto safe-bottom"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">Novo Aporte</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-secondary"><X size={18} /></button>
        </div>

        <label className="text-xs font-medium text-muted-foreground">Ativo</label>
        <select
          value={assetId}
          onChange={(e) => setAssetId(e.target.value)}
          className="w-full mt-1 mb-3 px-3 py-2.5 rounded-xl bg-secondary/50 border border-border text-sm font-semibold"
        >
          {assets.map((a) => (
            <option key={a.id} value={a.id}>{a.ticker} — {a.name ?? a.type}</option>
          ))}
        </select>

        <div className="flex gap-2 mb-3">
          <button type="button" onClick={() => setMode('qty')}
            className={`flex-1 py-2 rounded-xl text-xs font-semibold ${mode === 'qty' ? 'bg-primary text-primary-foreground' : 'bg-secondary/50 text-muted-foreground'}`}>
            Por quantidade
          </button>
          <button type="button" onClick={() => setMode('value')}
            className={`flex-1 py-2 rounded-xl text-xs font-semibold ${mode === 'value' ? 'bg-primary text-primary-foreground' : 'bg-secondary/50 text-muted-foreground'}`}>
            Por valor
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-3">
          {mode === 'qty' ? (
            <div>
              <label className="text-xs text-muted-foreground">Quantidade</label>
              <input inputMode="decimal" value={quantity} onChange={(e) => setQuantity(e.target.value)}
                className="w-full mt-1 px-3 py-2.5 rounded-xl bg-secondary/50 border border-border text-sm font-semibold tabular-nums" placeholder="0" />
            </div>
          ) : (
            <div>
              <label className="text-xs text-muted-foreground">Valor disponível</label>
              <CurrencyInput value={totalValue} onChange={setTotalValue} />
            </div>
          )}
          <div>
            <label className="text-xs text-muted-foreground">Preço unitário</label>
            <CurrencyInput value={price} onChange={setPrice} />
            {suggestion && suggestion > 0 && price === 0 && (
              <button type="button" onClick={() => setPrice(suggestion)} className="text-[11px] text-primary mt-1 font-medium">
                Usar preço atual
              </button>
            )}
          </div>
        </div>

        {mode === 'value' && price > 0 && totalValue > 0 && (
          <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 mb-3 text-xs">
            <div className="flex justify-between"><span className="text-muted-foreground">Cotas possíveis</span><span className="font-bold tabular-nums">{computedQty}</span></div>
            <div className="flex justify-between mt-1"><span className="text-muted-foreground">Usado</span><span className="font-bold tabular-nums">{(computedQty * price).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span></div>
            <div className="flex justify-between mt-1"><span className="text-muted-foreground">Saldo restante</span><span className="font-bold tabular-nums">{computedRemaining.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span></div>
          </div>
        )}


        <label className="text-xs text-muted-foreground">Data</label>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
          className="w-full mt-1 mb-4 px-3 py-2.5 rounded-xl bg-secondary/50 border border-border text-sm font-semibold" />

        <button onClick={submit} disabled={saving} className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-bold disabled:opacity-50">
          {saving ? 'Salvando...' : 'Registrar aporte'}
        </button>
      </motion.div>
    </div>
  );
}
