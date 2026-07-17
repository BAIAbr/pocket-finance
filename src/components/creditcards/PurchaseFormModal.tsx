import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { MoneyInput } from '@/components/ui/money-input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { format } from 'date-fns';
import type { PurchaseInput, CreditCard as CardType } from '@/hooks/useCreditCards';
import { useFinanceContext } from '@/contexts/FinanceContext';

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (input: PurchaseInput) => Promise<void>;
  cards: CardType[];
  initialCardId?: string;
}

export default function PurchaseFormModal({ open, onClose, onSubmit, cards, initialCardId }: Props) {
  const { categories } = useFinanceContext();
  const expenseCats = (categories as any[]).filter(c => c.type === 'expense');

  const [cardId, setCardId] = useState<string>(initialCardId ?? cards[0]?.id ?? '');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState<number>(0);
  const [installments, setInstallments] = useState('1');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [categoryId, setCategoryId] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setCardId(initialCardId ?? cards[0]?.id ?? '');
      setDescription(''); setAmount(0); setInstallments('1');
      setDate(format(new Date(), 'yyyy-MM-dd')); setCategoryId('');
    }
  }, [open, initialCardId, cards]);

  const per = useMemo(() => {
    const n = Math.max(1, Number(installments) || 1);
    return amount > 0 ? amount / n : 0;
  }, [amount, installments]);

  const handleSave = async () => {
    if (!cardId) { toast.error('Selecione um cartão'); return; }
    if (!description.trim()) { toast.error('Informe uma descrição'); return; }
    if (amount <= 0) { toast.error('Valor inválido'); return; }
    const n = Math.max(1, Math.min(60, Number(installments) || 1));
    setSubmitting(true);
    try {
      await onSubmit({
        card_id: cardId,
        description: description.trim(),
        category_id: categoryId || null,
        total_amount: amount,
        purchase_date: date,
        installments_count: n,
      });
      onClose();
    } finally { setSubmitting(false); }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Nova compra no crédito</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Cartão *</Label>
            <Select value={cardId} onValueChange={setCardId}>
              <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
              <SelectContent>{cards.map(c => <SelectItem key={c.id} value={c.id}>{c.name}{c.last_digits ? ` •••• ${c.last_digits}` : ''}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Descrição *</Label>
            <Input value={description} onChange={e => setDescription(e.target.value)} maxLength={80} placeholder="Ex: Mercado" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Valor total *</Label>
              <MoneyInput value={amount} onChange={(v) => setAmount(Number(v) || 0)} />
            </div>
            <div>
              <Label>Parcelas *</Label>
              <Input inputMode="numeric" value={installments} onChange={e => setInstallments(e.target.value.replace(/\D/g,'').slice(0,3))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Data</Label>
              <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
            </div>
            <div>
              <Label>Categoria</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger><SelectValue placeholder="Padrão do cartão" /></SelectTrigger>
                <SelectContent>{expenseCats.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          {per > 0 && Number(installments) > 1 && (
            <div className="text-sm text-muted-foreground bg-muted/50 rounded-md p-2">
              {installments}x de <strong>{per.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={submitting}>{submitting ? 'Salvando...' : 'Registrar'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
