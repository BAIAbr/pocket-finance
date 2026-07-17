import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, PieChart as PieIcon, TrendingUp, CreditCard as CardIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCreditCards } from '@/hooks/useCreditCards';
import { useFinanceContext } from '@/contexts/FinanceContext';
import { format, subMonths, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, Legend } from 'recharts';

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const PALETTE = ['#7c3aed', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#8b5cf6', '#14b8a6', '#f97316', '#06b6d4'];

export default function CreditCardReports() {
  const navigate = useNavigate();
  const { cards, purchases, installments } = useCreditCards();
  const { categories } = useFinanceContext();
  const cats = categories as any[];

  const [cardId, setCardId] = useState<string>('all');
  const [from, setFrom] = useState<string>(format(startOfMonth(subMonths(new Date(), 5)), 'yyyy-MM-dd'));
  const [to, setTo] = useState<string>(format(endOfMonth(new Date()), 'yyyy-MM-dd'));

  const catName = (cid: string | null) => cid ? (cats.find(c => c.id === cid)?.name ?? 'Sem categoria') : 'Sem categoria';
  const cardName = (id: string) => cards.find(c => c.id === id)?.name ?? '—';

  const filtered = useMemo(() => {
    const f = parseISO(from), t = parseISO(to);
    return purchases.filter(p => {
      const d = parseISO(p.purchase_date);
      if (cardId !== 'all' && p.card_id !== cardId) return false;
      return d >= f && d <= t;
    });
  }, [purchases, cardId, from, to]);

  const totals = useMemo(() => {
    const total = filtered.reduce((s, p) => s + Number(p.total_amount), 0);
    const count = filtered.length;
    const avg = count > 0 ? total / count : 0;
    return { total, count, avg };
  }, [filtered]);

  const byCategory = useMemo(() => {
    const map = new Map<string, number>();
    filtered.forEach(p => {
      const k = catName(p.category_id);
      map.set(k, (map.get(k) ?? 0) + Number(p.total_amount));
    });
    return Array.from(map, ([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [filtered, cats]);

  const byCard = useMemo(() => {
    const map = new Map<string, number>();
    filtered.forEach(p => {
      const k = cardName(p.card_id);
      map.set(k, (map.get(k) ?? 0) + Number(p.total_amount));
    });
    return Array.from(map, ([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [filtered, cards]);

  const monthly = useMemo(() => {
    const f = parseISO(from), t = parseISO(to);
    const map = new Map<string, number>();
    // Use installments to reflect actual invoice load per month
    installments.forEach(i => {
      if (cardId !== 'all' && i.card_id !== cardId) return;
      const d = parseISO(i.reference_month);
      if (d < startOfMonth(f) || d > endOfMonth(t)) return;
      const k = format(d, 'yyyy-MM');
      map.set(k, (map.get(k) ?? 0) + Number(i.amount));
    });
    return Array.from(map, ([k, value]) => ({
      name: format(parseISO(k + '-01'), "MMM/yy"),
      key: k,
      value,
    })).sort((a, b) => a.key.localeCompare(b.key));
  }, [installments, cardId, from, to]);

  const exportCsv = () => {
    const rows = [['Data', 'Cartão', 'Descrição', 'Categoria', 'Parcelas', 'Total']];
    filtered.forEach(p => {
      rows.push([
        p.purchase_date,
        cardName(p.card_id),
        `"${p.description.replace(/"/g, '""')}"`,
        catName(p.category_id),
        String(p.installments_count),
        Number(p.total_amount).toFixed(2).replace('.', ','),
      ]);
    });
    const csv = rows.map(r => r.join(';')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `cartoes-${from}-a-${to}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-5xl mx-auto p-4 pb-24 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate('/cards')}><ArrowLeft className="w-4 h-4 mr-1" />Voltar</Button>
        <Button variant="outline" size="sm" onClick={exportCsv} disabled={filtered.length === 0}>
          <Download className="w-4 h-4 mr-1" />Exportar CSV
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-bold">Relatórios de cartão</h1>
        <p className="text-sm text-muted-foreground">Análise de gastos por período, categoria e cartão</p>
      </div>

      <div className="rounded-xl border bg-card p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <Label className="text-xs">Cartão</Label>
          <Select value={cardId} onValueChange={setCardId}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os cartões</SelectItem>
              {cards.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">De</Label>
          <Input type="date" value={from} onChange={e => setFrom(e.target.value)} />
        </div>
        <div>
          <Label className="text-xs">Até</Label>
          <Input type="date" value={to} onChange={e => setTo(e.target.value)} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border bg-card p-4">
          <div className="text-xs text-muted-foreground">Total gasto</div>
          <div className="text-xl font-bold text-red-500">{fmt(totals.total)}</div>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <div className="text-xs text-muted-foreground">Compras</div>
          <div className="text-xl font-bold">{totals.count}</div>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <div className="text-xs text-muted-foreground">Ticket médio</div>
          <div className="text-xl font-bold">{fmt(totals.avg)}</div>
        </div>
      </div>

      <div className="rounded-xl border bg-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="w-4 h-4 text-primary" />
          <h3 className="font-semibold">Evolução mensal (parcelas na fatura)</h3>
        </div>
        {monthly.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground">Sem dados no período</div>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={monthly}>
              <XAxis dataKey="name" fontSize={11} />
              <YAxis fontSize={11} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: any) => fmt(Number(v))} />
              <Bar dataKey="value" fill="#7c3aed" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <PieIcon className="w-4 h-4 text-primary" />
            <h3 className="font-semibold">Por categoria</h3>
          </div>
          {byCategory.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">Sem dados</div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={byCategory} dataKey="value" nameKey="name" outerRadius={70} innerRadius={40}>
                    {byCategory.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: any) => fmt(Number(v))} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1 mt-2">
                {byCategory.slice(0, 6).map((c, i) => (
                  <div key={c.name} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: PALETTE[i % PALETTE.length] }} />
                      <span className="truncate">{c.name}</span>
                    </div>
                    <span className="font-semibold shrink-0">{fmt(c.value)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <CardIcon className="w-4 h-4 text-primary" />
            <h3 className="font-semibold">Por cartão</h3>
          </div>
          {byCard.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">Sem dados</div>
          ) : (
            <div className="space-y-2">
              {byCard.map((c, i) => {
                const pct = totals.total > 0 ? (c.value / totals.total) * 100 : 0;
                return (
                  <div key={c.name}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="truncate">{c.name}</span>
                      <span className="font-semibold">{fmt(c.value)}</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: PALETTE[i % PALETTE.length] }} />
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">{pct.toFixed(1)}%</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
