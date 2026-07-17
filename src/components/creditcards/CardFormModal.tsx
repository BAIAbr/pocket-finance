import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { MoneyInput } from '@/components/ui/money-input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import type { CardFormInput, CreditCard as CardType } from '@/hooks/useCreditCards';
import { useFinanceContext } from '@/contexts/FinanceContext';

const BRANDS = ['Visa','Mastercard','Elo','American Express','Hipercard','Outro'];
const BANKS = ['Nubank','Inter','Itaú','Bradesco','Santander','Banco do Brasil','Caixa','C6','BTG','XP','PicPay','Neon','Outro'];
const COLORS = ['#7c3aed','#8a05be','#0891b2','#059669','#ea580c','#dc2626','#1e293b','#f59e0b'];

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (input: CardFormInput) => Promise<void>;
  editing?: CardType | null;
}

export default function CardFormModal({ open, onClose, onSubmit, editing }: Props) {
  const { categories } = useFinanceContext();
  const expenseCats = (categories as any[]).filter(c => c.type === 'expense');

  const [name, setName] = useState('');
  const [bank, setBank] = useState('');
  const [brand, setBrand] = useState('');
  const [color, setColor] = useState('#7c3aed');
  const [lastDigits, setLastDigits] = useState('');
  const [creditLimit, setCreditLimit] = useState<number>(0);
  const [closingDay, setClosingDay] = useState('10');
  const [dueDay, setDueDay] = useState('17');
  const [categoryId, setCategoryId] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (editing) {
      setName(editing.name); setBank(editing.bank ?? ''); setBrand(editing.brand ?? '');
      setColor(editing.color); setLastDigits(editing.last_digits ?? '');
      setCreditLimit(Number(editing.credit_limit));
      setClosingDay(String(editing.closing_day)); setDueDay(String(editing.due_day));
      setCategoryId(editing.default_category_id ?? '');
    } else {
      setName(''); setBank(''); setBrand(''); setColor('#7c3aed'); setLastDigits('');
      setCreditLimit(0); setClosingDay('10'); setDueDay('17'); setCategoryId('');
    }
  }, [editing, open]);

  const handleSave = async () => {
    if (!name.trim()) { toast.error('Informe um nome'); return; }
    if (creditLimit <= 0) { toast.error('Limite inválido'); return; }
    const cd = Number(closingDay), dd = Number(dueDay);
    if (cd < 1 || cd > 31 || dd < 1 || dd > 31) { toast.error('Dias inválidos'); return; }
    if (lastDigits && !/^\d{4}$/.test(lastDigits)) { toast.error('Últimos 4 dígitos inválidos'); return; }
    setSubmitting(true);
    try {
      await onSubmit({
        name: name.trim(), bank: bank || null, brand: brand || null,
        color, last_digits: lastDigits || null,
        credit_limit: creditLimit, closing_day: cd, due_day: dd,
        default_category_id: categoryId || null,
      });
      onClose();
    } finally { setSubmitting(false); }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? 'Editar cartão' : 'Novo cartão'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Nome do cartão *</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Nubank Roxinho" maxLength={60} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Banco</Label>
              <Select value={bank} onValueChange={setBank}>
                <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                <SelectContent>{BANKS.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Bandeira</Label>
              <Select value={brand} onValueChange={setBrand}>
                <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                <SelectContent>{BRANDS.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Últimos 4 dígitos</Label>
              <Input inputMode="numeric" maxLength={4} value={lastDigits} onChange={e => setLastDigits(e.target.value.replace(/\D/g,''))} placeholder="1234" />
            </div>
            <div>
              <Label>Limite total *</Label>
              <MoneyInput value={creditLimit} onChange={(v) => setCreditLimit(Number(v) || 0)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Dia de fechamento *</Label>
              <Input inputMode="numeric" value={closingDay} onChange={e => setClosingDay(e.target.value.replace(/\D/g,'').slice(0,2))} />
            </div>
            <div>
              <Label>Dia de vencimento *</Label>
              <Input inputMode="numeric" value={dueDay} onChange={e => setDueDay(e.target.value.replace(/\D/g,'').slice(0,2))} />
            </div>
          </div>
          <div>
            <Label>Categoria padrão</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger><SelectValue placeholder="Nenhuma" /></SelectTrigger>
              <SelectContent>{expenseCats.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Cor do cartão</Label>
            <div className="flex gap-2 mt-2 flex-wrap">
              {COLORS.map(c => (
                <button key={c} type="button" onClick={() => setColor(c)}
                  className={`h-8 w-8 rounded-full border-2 transition-transform ${color === c ? 'border-foreground scale-110' : 'border-transparent'}`}
                  style={{ background: c }} aria-label={c} />
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={submitting}>{submitting ? 'Salvando...' : 'Salvar'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
