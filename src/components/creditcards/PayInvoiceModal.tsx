import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { MoneyInput } from '@/components/ui/money-input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from 'sonner';
import type { CreditCardInvoice } from '@/hooks/useCreditCards';

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (amount: number, account: string) => Promise<void>;
  invoice: CreditCardInvoice | null;
}

export default function PayInvoiceModal({ open, onClose, onSubmit, invoice }: Props) {
  const [mode, setMode] = useState<'full' | 'partial'>('full');
  const [amount, setAmount] = useState<number>(0);
  const [account, setAccount] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const remaining = invoice ? Number(invoice.total_amount) - Number(invoice.paid_amount) : 0;

  useEffect(() => {
    if (open && invoice) {
      setMode('full');
      setAmount(remaining);
      setAccount('');
    }
  }, [open, invoice, remaining]);

  const handleSave = async () => {
    const val = mode === 'full' ? remaining : amount;
    if (val <= 0) { toast.error('Valor inválido'); return; }
    if (val > remaining + 0.01) { toast.error('Valor maior que o restante'); return; }
    setSubmitting(true);
    try { await onSubmit(val, account); onClose(); } finally { setSubmitting(false); }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Pagar fatura</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="text-sm text-muted-foreground bg-muted/50 rounded-md p-3">
            Restante: <strong className="text-foreground">{remaining.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong>
          </div>
          <RadioGroup value={mode} onValueChange={(v: any) => { setMode(v); if (v === 'full') setAmount(remaining); }}>
            <div className="flex items-center gap-2"><RadioGroupItem value="full" id="pf-full" /><Label htmlFor="pf-full">Pagamento integral</Label></div>
            <div className="flex items-center gap-2"><RadioGroupItem value="partial" id="pf-part" /><Label htmlFor="pf-part">Pagamento parcial</Label></div>
          </RadioGroup>
          {mode === 'partial' && (
            <div>
              <Label>Valor</Label>
              <MoneyInput value={amount} onChange={(v) => setAmount(Number(v) || 0)} />
            </div>
          )}
          <div>
            <Label>Conta / origem (opcional)</Label>
            <Input value={account} onChange={e => setAccount(e.target.value)} placeholder="Ex: Conta Corrente" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={submitting}>{submitting ? 'Processando...' : 'Confirmar pagamento'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
