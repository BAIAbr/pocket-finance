import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { MoneyInput } from '@/components/ui/money-input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import type { CreditCardInstallment, CreditCardInvoice } from '@/hooks/useCreditCards';

interface Props {
  open: boolean;
  onClose: () => void;
  installment: CreditCardInstallment | null;
  invoices: CreditCardInvoice[];
  onSaveAmount: (id: string, amount: number) => Promise<void>;
  onAnticipate: (id: string, targetInvoiceId: string) => Promise<void>;
}

const fmtMonth = (d: string) =>
  new Date(d + 'T00:00:00').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

export default function InstallmentEditModal({ open, onClose, installment, invoices, onSaveAmount, onAnticipate }: Props) {
  const [amount, setAmount] = useState(0);
  const [targetInv, setTargetInv] = useState<string>('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && installment) {
      setAmount(Number(installment.amount));
      setTargetInv('');
    }
  }, [open, installment]);

  if (!installment) return null;

  const cardInvoices = invoices
    .filter(i => i.card_id === installment.card_id && i.status !== 'paid')
    .sort((a, b) => a.reference_month.localeCompare(b.reference_month));

  const otherInvoices = cardInvoices.filter(i => i.id !== installment.invoice_id);

  const handleSaveAmount = async () => {
    if (amount <= 0) { toast.error('Valor inválido'); return; }
    setSaving(true);
    try { await onSaveAmount(installment.id, amount); onClose(); } finally { setSaving(false); }
  };

  const handleAnticipate = async () => {
    if (!targetInv) { toast.error('Selecione a fatura de destino'); return; }
    setSaving(true);
    try { await onAnticipate(installment.id, targetInv); onClose(); } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Editar parcela</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Valor da parcela</Label>
            <MoneyInput value={amount} onChange={(v) => setAmount(Number(v) || 0)} />
            <p className="text-xs text-muted-foreground mt-1">
              Parcela {installment.installment_number}/{installment.total_installments}
            </p>
          </div>

          {otherInvoices.length > 0 && (
            <div className="pt-3 border-t">
              <Label>Mover para outra fatura</Label>
              <Select value={targetInv} onValueChange={setTargetInv}>
                <SelectTrigger><SelectValue placeholder="Escolher fatura..." /></SelectTrigger>
                <SelectContent>
                  {otherInvoices.map(i => (
                    <SelectItem key={i.id} value={i.id}>
                      {fmtMonth(i.reference_month)} ({i.status === 'open' ? 'aberta' : i.status})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Útil para antecipar ou adiar o pagamento desta parcela.
              </p>
            </div>
          )}
        </div>
        <DialogFooter className="gap-2 sm:gap-2 flex-col sm:flex-row">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          {targetInv && (
            <Button variant="secondary" onClick={handleAnticipate} disabled={saving}>
              Mover parcela
            </Button>
          )}
          <Button onClick={handleSaveAmount} disabled={saving}>
            {saving ? 'Salvando...' : 'Salvar valor'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
