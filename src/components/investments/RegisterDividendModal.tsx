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
  onSubmit: (input: { asset_id: string; amount: number; pay_date: string; type: 'dividend' | 'jcp' | 'rendimento' }) => Promise<void>;
}

export function RegisterDividendModal({ open, onClose, assets, onSubmit }: Props) {
  const [assetId, setAssetId] = useState(assets[0]?.id ?? '');
  const [amount, setAmount] = useState(0);
  const [payDate, setPayDate] = useState(new Date().toISOString().slice(0, 10));
  const [type, setType] = useState<'dividend' | 'jcp' | 'rendimento'>('dividend');
  const [saving, setSaving] = useState(false);

  if (!open) return null;

  const submit = async () => {
    if (!assetId || amount <= 0) return toast.error('Preencha os campos');
    setSaving(true);
    try {
      await onSubmit({ asset_id: assetId, amount, pay_date: payDate, type });
      toast.success('Provento registrado');
      onClose();
      setAmount(0);
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
          <h2 className="text-lg font-bold">Registrar Provento</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-secondary"><X size={18} /></button>
        </div>

        <label className="text-xs font-medium text-muted-foreground">Ativo</label>
        <select value={assetId} onChange={(e) => setAssetId(e.target.value)}
          className="w-full mt-1 mb-3 px-3 py-2.5 rounded-xl bg-secondary/50 border border-border text-sm font-semibold">
          {assets.map((a) => <option key={a.id} value={a.id}>{a.ticker}</option>)}
        </select>

        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="text-xs text-muted-foreground">Valor recebido</label>
            <CurrencyInput value={amount} onChange={setAmount} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Tipo</label>
            <select value={type} onChange={(e) => setType(e.target.value as any)}
              className="w-full mt-1 px-3 py-2.5 rounded-xl bg-secondary/50 border border-border text-sm font-semibold">
              <option value="dividend">Dividendo</option>
              <option value="jcp">JCP</option>
              <option value="rendimento">Rendimento</option>
            </select>
          </div>
        </div>

        <label className="text-xs text-muted-foreground">Data de pagamento</label>
        <input type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)}
          className="w-full mt-1 mb-4 px-3 py-2.5 rounded-xl bg-secondary/50 border border-border text-sm font-semibold" />

        <button onClick={submit} disabled={saving} className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-bold disabled:opacity-50">
          {saving ? 'Salvando...' : 'Registrar'}
        </button>
      </motion.div>
    </div>
  );
}
