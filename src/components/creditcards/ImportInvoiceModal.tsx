import { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { parseOFX, parseCSVRaw, guessCsvMapping, applyCsvMapping, parseXLSXRaw, type ParsedRow, type CsvMapping } from '@/lib/import/parsers';
import type { CreditCard, CreditCardPurchase, PurchaseInput } from '@/hooks/useCreditCards';

interface Category { id: string; name: string; type: string }

interface Props {
  open: boolean;
  onClose: () => void;
  card: CreditCard;
  categories: Category[];
  existingPurchases: CreditCardPurchase[];
  onImport: (input: PurchaseInput) => Promise<void>;
}

interface Row extends ParsedRow {
  selected: boolean;
  category_id: string | null;
  duplicate: boolean;
}

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function ImportInvoiceModal({ open, onClose, card, categories, existingPurchases, onImport }: Props) {
  const [rows, setRows] = useState<Row[]>([]);
  const [csvRaw, setCsvRaw] = useState<{ headers: string[]; rows: Record<string, string>[] } | null>(null);
  const [mapping, setMapping] = useState<CsvMapping | null>(null);
  const [fileName, setFileName] = useState('');
  const [importing, setImporting] = useState(false);

  const expenseCats = useMemo(() => categories.filter(c => c.type === 'expense'), [categories]);
  const defaultCat = card.default_category_id ?? expenseCats[0]?.id ?? null;

  const reset = () => {
    setRows([]); setCsvRaw(null); setMapping(null); setFileName('');
  };

  const markDuplicates = (parsed: ParsedRow[]): Row[] => {
    return parsed.map(r => {
      const dup = existingPurchases.some(p =>
        p.card_id === card.id &&
        p.purchase_date === r.date &&
        Math.abs(Number(p.total_amount) - r.amount) < 0.01 &&
        p.description.trim().toUpperCase() === r.description.trim().toUpperCase()
      );
      return { ...r, selected: !dup, category_id: defaultCat, duplicate: dup };
    });
  };

  const handleFile = async (f: File) => {
    setFileName(f.name);
    const ext = f.name.toLowerCase().split('.').pop() || '';
    try {
      if (ext === 'ofx') {
        const text = await f.text();
        const res = parseOFX(text);
        const expenses = res.rows.filter(r => r.type === 'expense');
        if (expenses.length === 0) { toast.error('Nenhum lançamento encontrado no arquivo'); return; }
        setRows(markDuplicates(expenses));
      } else if (ext === 'csv' || ext === 'txt') {
        const text = await f.text();
        const raw = parseCSVRaw(text);
        setCsvRaw(raw);
        const guessed = guessCsvMapping(raw.headers);
        if (guessed) {
          setMapping(guessed);
          const parsed = applyCsvMapping(raw.rows, guessed).filter(r => r.type === 'expense');
          setRows(markDuplicates(parsed));
        } else {
          toast.warning('Selecione as colunas manualmente');
        }
      } else if (ext === 'xlsx' || ext === 'xls') {
        const buf = await f.arrayBuffer();
        const raw = parseXLSXRaw(buf);
        setCsvRaw(raw);
        const guessed = guessCsvMapping(raw.headers);
        if (guessed) {
          setMapping(guessed);
          const parsed = applyCsvMapping(raw.rows, guessed).filter(r => r.type === 'expense');
          setRows(markDuplicates(parsed));
        } else {
          toast.warning('Selecione as colunas manualmente');
        }
      } else {
        toast.error('Formato não suportado. Use OFX, CSV ou XLSX.');
      }
    } catch (e: any) {
      toast.error('Erro ao ler arquivo: ' + e.message);
    }
  };

  const applyMappingChange = (m: CsvMapping) => {
    setMapping(m);
    if (csvRaw) {
      const parsed = applyCsvMapping(csvRaw.rows, m).filter(r => r.type === 'expense');
      setRows(markDuplicates(parsed));
    }
  };

  const selectedRows = rows.filter(r => r.selected);
  const totalSelected = selectedRows.reduce((s, r) => s + r.amount, 0);

  const handleImport = async () => {
    if (selectedRows.length === 0) { toast.error('Selecione ao menos um lançamento'); return; }
    setImporting(true);
    let ok = 0, fail = 0;
    for (const r of selectedRows) {
      try {
        await onImport({
          card_id: card.id,
          description: r.description || 'Importado',
          category_id: r.category_id ?? null,
          total_amount: r.amount,
          purchase_date: r.date,
          installments_count: 1,
        });
        ok++;
      } catch { fail++; }
    }
    setImporting(false);
    toast.success(`${ok} lançamento(s) importado(s)${fail ? ` • ${fail} falha(s)` : ''}`);
    reset();
    onClose();
  };

  const handleClose = () => { reset(); onClose(); };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Importar fatura</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-3">
          {rows.length === 0 && !csvRaw && (
            <>
              <div className="rounded-lg border border-dashed p-6 text-center">
                <input
                  type="file"
                  accept=".ofx,.csv,.txt,.xlsx,.xls"
                  onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                  className="hidden"
                  id="cc-import-file"
                />
                <label htmlFor="cc-import-file" className="cursor-pointer">
                  <div className="text-sm font-medium mb-1">Envie um arquivo OFX, CSV ou XLSX</div>
                  <div className="text-xs text-muted-foreground mb-3">Extratos exportados do app do seu banco/emissor</div>
                  <Button type="button" variant="outline" size="sm" asChild>
                    <span>Escolher arquivo</span>
                  </Button>
                </label>
              </div>
              <div className="text-xs text-muted-foreground px-1">
                Apenas gastos (débitos) são importados. Pagamentos e créditos são ignorados.
              </div>
            </>
          )}

          {csvRaw && rows.length === 0 && (
            <div className="space-y-2 rounded-lg border p-3">
              <div className="text-sm font-medium">Selecione as colunas</div>
              <div className="grid grid-cols-3 gap-2">
                {(['date', 'description', 'amount'] as const).map(field => (
                  <div key={field}>
                    <Label className="text-xs capitalize">{field === 'date' ? 'Data' : field === 'description' ? 'Descrição' : 'Valor'}</Label>
                    <Select
                      value={mapping?.[field] ?? ''}
                      onValueChange={(v) => applyMappingChange({ ...(mapping ?? { date: '', description: '', amount: '' }), [field]: v })}
                    >
                      <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                      <SelectContent>
                        {csvRaw.headers.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </div>
          )}

          {rows.length > 0 && (
            <>
              <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
                <div>
                  {fileName && <span className="mr-2">{fileName}</span>}
                  {rows.length} linha(s) • {rows.filter(r => r.duplicate).length} possíveis duplicados
                </div>
                <div className="flex gap-2">
                  <button className="hover:underline" onClick={() => setRows(rs => rs.map(r => ({ ...r, selected: true })))}>Todos</button>
                  <button className="hover:underline" onClick={() => setRows(rs => rs.map(r => ({ ...r, selected: false })))}>Nenhum</button>
                </div>
              </div>
              <div className="rounded-lg border divide-y">
                {rows.map((r, idx) => (
                  <div key={idx} className={`p-2 flex items-center gap-2 ${r.duplicate ? 'bg-yellow-500/5' : ''}`}>
                    <Checkbox checked={r.selected} onCheckedChange={(v) => setRows(rs => rs.map((x, i) => i === idx ? { ...x, selected: !!v } : x))} />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium truncate flex items-center gap-2">
                        {r.description || '(sem descrição)'}
                        {r.duplicate && <Badge variant="outline" className="text-[10px] h-4 border-yellow-500/50 text-yellow-700 dark:text-yellow-500">Duplicado</Badge>}
                      </div>
                      <div className="text-xs text-muted-foreground">{new Date(r.date + 'T00:00:00').toLocaleDateString('pt-BR')}</div>
                    </div>
                    <Select value={r.category_id ?? ''} onValueChange={(v) => setRows(rs => rs.map((x, i) => i === idx ? { ...x, category_id: v } : x))}>
                      <SelectTrigger className="h-8 w-32 text-xs shrink-0"><SelectValue placeholder="Categoria" /></SelectTrigger>
                      <SelectContent>
                        {expenseCats.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <div className="text-sm font-semibold w-24 text-right shrink-0">{fmt(r.amount)}</div>
                  </div>
                ))}
              </div>
              <div className="text-sm text-right pr-1">
                Total selecionado: <strong>{fmt(totalSelected)}</strong>
              </div>
            </>
          )}
        </div>

        <DialogFooter className="pt-2 border-t">
          <Button variant="outline" onClick={handleClose} disabled={importing}>Cancelar</Button>
          <Button onClick={handleImport} disabled={importing || selectedRows.length === 0}>
            {importing ? 'Importando...' : `Importar ${selectedRows.length || ''}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
