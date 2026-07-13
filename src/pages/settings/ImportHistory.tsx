import { useEffect, useState } from 'react';
import { SettingsSubPageHeader } from '@/components/settings/SettingsSubPageHeader';
import { History, Trash2, Download } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { formatBRL } from '@/lib/currency';
import { toast } from 'sonner';
import Papa from 'papaparse';

interface ImportRow {
  id: string;
  file_name: string;
  file_type: string;
  bank_detected: string | null;
  records_imported: number;
  records_total: number;
  records_duplicated: number;
  income_total: number;
  expense_total: number;
  status: string;
  created_at: string;
}

export default function ImportHistory() {
  const { user } = useAuth();
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase.from('import_history').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
    setRows((data || []) as ImportRow[]);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user?.id]);

  const rollback = async (id: string) => {
    if (!confirm('Excluir esta importação também apagará os lançamentos associados. Continuar?')) return;
    await supabase.from('transactions').delete().eq('import_id', id);
    await supabase.from('import_history').delete().eq('id', id);
    toast.success('Importação removida');
    load();
  };

  const download = async (id: string, file_name: string) => {
    const { data } = await supabase.from('transactions').select('date, type, amount, description').eq('import_id', id).order('date');
    const csv = Papa.unparse((data || []) as any[]);
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${file_name.replace(/\.[^.]+$/, '')}-lancamentos.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <SettingsSubPageHeader title="Histórico de importações" description="Todos os arquivos que você importou." icon={<History size={22} />} />
      <main className="px-4 max-w-3xl mx-auto space-y-3">
        {loading && <p className="text-sm text-muted-foreground">Carregando…</p>}
        {!loading && !rows.length && <p className="text-sm text-muted-foreground text-center py-10">Nenhuma importação ainda.</p>}
        {rows.map(r => (
          <div key={r.id} className="card-finance flex flex-col gap-2">
            <div className="flex items-start justify-between gap-2 flex-wrap">
              <div className="min-w-0">
                <p className="font-semibold truncate">{r.file_name}</p>
                <p className="text-xs text-muted-foreground">
                  {r.file_type.toUpperCase()} • {r.bank_detected || '—'} • {new Date(r.created_at).toLocaleString('pt-BR')}
                </p>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full ${
                r.status === 'success' ? 'bg-success/15 text-success'
                : r.status === 'partial' ? 'bg-warning/15 text-warning'
                : r.status === 'error' ? 'bg-destructive/15 text-destructive'
                : 'bg-secondary text-foreground'
              }`}>{r.status}</span>
            </div>
            <div className="grid grid-cols-4 gap-2 text-xs">
              <div><p className="text-muted-foreground">Importados</p><p className="font-semibold">{r.records_imported}/{r.records_total}</p></div>
              <div><p className="text-muted-foreground">Duplicados</p><p className="font-semibold">{r.records_duplicated}</p></div>
              <div><p className="text-muted-foreground">Receitas</p><p className="font-semibold text-success">{formatBRL(Number(r.income_total))}</p></div>
              <div><p className="text-muted-foreground">Despesas</p><p className="font-semibold text-destructive">{formatBRL(Number(r.expense_total))}</p></div>
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={() => download(r.id, r.file_name)} className="flex-1 py-2 rounded-xl bg-secondary text-xs font-medium touch-scale flex items-center justify-center gap-1"><Download size={14} /> Baixar CSV</button>
              <button onClick={() => rollback(r.id)} className="flex-1 py-2 rounded-xl bg-destructive/10 text-destructive text-xs font-medium touch-scale flex items-center justify-center gap-1"><Trash2 size={14} /> Excluir</button>
            </div>
          </div>
        ))}
      </main>
    </div>
  );
}
