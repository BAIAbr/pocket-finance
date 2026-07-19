import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { MoneyInput } from '@/components/ui/money-input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { format } from 'date-fns';
import type { CreditCard as CardType, CreditCardRecurring, RecurringInput } from '@/hooks/useCreditCards';
import { useFinanceContext } from '@/contexts/FinanceContext';

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (input: RecurringInput) => Promise<void>;
  cards: CardType[];
  initialCardId?: string;
  editing?: CreditCardRecurring | null;
}

export default function RecurringFormModal({ open, onClose, onSubmit, cards, initialCardId, editing }: Props) {
  const { categories } = useFinanceContext();
  const expenseCats = (categories as any[]).filter(c => c.type === 'expense');

  const [cardId, setCardId] = useState<string>(initialCardId ?? cards[0]?.id ?? '');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState<number>(0);
  const [day, setDay] = useState('1');
  const [startsOn, setStartsOn] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [endsOn, setEndsOn] = useState('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [isActive, setIsActive] = useState(true);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setCardId(editing.card_id);
      setDescription(editing.description);
      setAmount(Number(editing.amount));
      setDay(String(editing.day_of_month));
      setStartsOn(editing.starts_on);
      setEndsOn(editing.ends_on ?? '');
      setCategoryId(editing.category_id ?? '');
      setIsActive(editing.is_active);
      setNotes(editing.notes ?? '');
    } else {
      setCardId(initialCardId ?? cards[0]?.id ?? '');
      setDescription(''); setAmount(0); setDay('1');
      setStartsOn(format(new Date(), 'yyyy-MM-dd'));
      setEndsOn(''); setCategoryId(''); setIsActive(true); setNotes('');
    }
  }, [open, editing, initialCardId, cards]);

  const handleSave = async () => {
    if (!cardId) { toast.error('Selecione um cartão'); return; }
    if (!description.trim()) { toast.error('Informe uma descrição'); return; }
    if (amount <= 0) { toast.error('Valor inválido'); return; }
    const d = Math.max(1, Math.min(31, Number(day) || 1));
    setSubmitting(true);
    try {
      await onSubmit({
        card_id: cardId,
        description: description.trim(),
        category_id: categoryId || null,
        amount,
        day_of_month: d,
        starts_on: startsOn,
        ends_on: endsOn || null,
        is_active: isActive,
        notes: notes.trim() || null,
      });
      onClose();
    } finally { setSubmitting(false); }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? 'Editar recorrência' : 'Nova recorrência no cartão'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Cartão *</Label>
            <Select value={cardId} onValueChange={setCardId}>
              <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
              <SelectContent>{cards.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Descrição *</Label>
            <Input value={description} onChange={e => setDescription(e.target.value)} maxLength={80} placeholder="Ex: Netflix, Spotify" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Valor mensal *</Label>
              <MoneyInput value={amount} onChange={(v) => setAmount(Number(v) || 0)} />
            </div>
            <div>
              <Label>Dia do mês *</Label>
              <Input inputMode="numeric" value={day} onChange={e => setDay(e.target.value.replace(/\D/g,'').slice(0,2))} />
            </div>
          </div>
          <div>
            <Label>Categoria</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger><SelectValue placeholder="Padrão do cartão" /></SelectTrigger>
              <SelectContent>{expenseCats.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Início</Label>
              <Input type="date" value={startsOn} onChange={e => setStartsOn(e.target.value)} />
            </div>
            <div>
              <Label>Fim (opcional)</Label>
              <Input type="date" value={endsOn} onChange={e => setEndsOn(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Observações</Label>
            <Input value={notes} onChange={e => setNotes(e.target.value)} maxLength={200} />
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <div className="text-sm font-medium">Ativa</div>
              <div className="text-xs text-muted-foreground">Lançar automaticamente todo mês</div>
            </div>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </div>
          <p className="text-xs text-muted-foreground">
            A cobrança é lançada automaticamente no dia informado e vai para a fatura conforme o fechamento do cartão.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={submitting}>{submitting ? 'Salvando...' : 'Salvar'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
