import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { SettingsSubPageHeader } from '@/components/settings/SettingsSubPageHeader';
import { Upload, FileText, FileSpreadsheet, Check, X, AlertTriangle, History as HistoryIcon, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useFinanceContext } from '@/contexts/FinanceContext';
import {
  parseOFX, parseCSVRaw, guessCsvMapping, applyCsvMapping, parseXLSXRaw,
  type ParsedRow, type CsvMapping, makeExternalHash,
} from '@/lib/import/parsers';
import { applyRules, normalizeText, type UserRule } from '@/lib/import/categoryRules';
import { formatBRL as formatCurrency } from '@/lib/currency';

type FileType = 'ofx' | 'csv' | 'xlsx';
type Step = 'choose' | 'upload' | 'map' | 'preview' | 'importing' | 'done';

interface PreviewRow extends ParsedRow {
  id: string;
  categoryId: string | null;
  externalHash: string;
  isDuplicate: boolean;
  include: boolean;
  originalCategoryId: string | null;
}

const MAX_SIZE = 10 * 1024 * 1024;

export default function ImportWizard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { categories, refresh } = useFinanceContext() as any;

  const [step, setStep] = useState<Step>('choose');
  const [fileType, setFileType] = useState<FileType | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [rawRows, setRawRows] = useState<Record<string, string>[]>([]);
  const [rawHeaders, setRawHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<CsvMapping | null>(null);
  const [detected, setDetected] = useState<{ bank?: string; period?: string; count?: number }>({});
  const [preview, setPreview] = useState<PreviewRow[]>([]);
  const [progress, setProgress] = useState(0);
  const [importedCount, setImportedCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const categoriesByName = useMemo(() => {
    const map: Record<string, { id: string; type: string }[]> = {};
    for (const c of (categories || []) as any[]) {
      const key = (c.name || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
      if (!map[key]) map[key] = [];
      map[key].push({ id: c.id, type: c.type });
    }
    return map;
  }, [categories]);

  const resetAll = () => {
    setStep('choose'); setFileType(null); setFile(null); setRawRows([]); setRawHeaders([]);
    setMapping(null); setDetected({}); setPreview([]); setProgress(0); setImportedCount(0);
  };

  const handleFile = async (f: File) => {
    if (!fileType) return;
    if (f.size > MAX_SIZE) { toast.error('Arquivo maior que 10MB'); return; }
    const ext = f.name.split('.').pop()?.toLowerCase();
    const okExt = (fileType === 'ofx' && ext === 'ofx') || (fileType === 'csv' && ext === 'csv') ||
      (fileType === 'xlsx' && (ext === 'xlsx' || ext === 'xls'));
    if (!okExt) { toast.error('Extensão do arquivo não confere com o tipo selecionado'); return; }
    setFile(f);

    try {
      if (fileType === 'ofx') {
        const text = await f.text();
        const res = parseOFX(text);
        if (!res.rows.length) { toast.error('Nenhuma transação encontrada no OFX'); return; }
        setDetected({ bank: res.bank, period: res.period?.start ? `${res.period.start} → ${res.period.end}` : undefined, count: res.rows.length });
        await buildPreview(res.rows);
        setStep('preview');
      } else if (fileType === 'csv') {
        const text = await f.text();
        const { headers, rows } = parseCSVRaw(text);
        setRawHeaders(headers); setRawRows(rows);
        const guess = guessCsvMapping(headers);
        if (guess) { setMapping(guess); await runMapping(guess, rows); }
        else { setStep('map'); }
      } else {
        const buf = await f.arrayBuffer();
        const { headers, rows } = parseXLSXRaw(buf);
        setRawHeaders(headers); setRawRows(rows);
        const guess = guessCsvMapping(headers);
        if (guess) { setMapping(guess); await runMapping(guess, rows); }
        else { setStep('map'); }
      }
    } catch (e) {
      console.error(e);
      toast.error('Não foi possível ler o arquivo');
    }
  };

  const runMapping = async (m: CsvMapping, rows: Record<string, string>[]) => {
    const parsed = applyCsvMapping(rows, m);
    if (!parsed.length) { toast.error('Nenhuma linha válida após o mapeamento'); return; }
    setDetected({ count: parsed.length });
    await buildPreview(parsed);
    setStep('preview');
  };

  const buildPreview = async (rows: ParsedRow[]) => {
    if (!user) return;
    // Carrega regras do usuário
    const { data: rulesData } = await supabase.from('import_rules').select('pattern, category_id, match_type').eq('user_id', user.id);
    const userRules = ((rulesData || []) as any[]).map(r => ({ pattern: r.pattern, category_id: r.category_id, match_type: r.match_type })) as UserRule[];

    // hashes
    const withHash = await Promise.all(rows.map(async r => ({ row: r, hash: await makeExternalHash(user.id, r) })));
    const hashes = withHash.map(h => h.hash);
    let existing = new Set<string>();
    if (hashes.length) {
      // fetch in chunks to avoid URL length limits
      const chunkSize = 200;
      for (let i = 0; i < hashes.length; i += chunkSize) {
        const slice = hashes.slice(i, i + chunkSize);
        const { data } = await supabase.from('imported_transactions_map').select('external_hash').in('external_hash', slice);
        (data || []).forEach((d: any) => existing.add(d.external_hash));
      }
    }

    const previewRows: PreviewRow[] = withHash.map(({ row, hash }, idx) => {
      const catId = applyRules(row.description, row.type, userRules, categoriesByName);
      return {
        ...row,
        id: `${idx}-${hash.slice(0, 8)}`,
        categoryId: catId,
        externalHash: hash,
        isDuplicate: existing.has(hash),
        include: !existing.has(hash),
        originalCategoryId: catId,
      };
    });
    setPreview(previewRows);
  };

  const summary = useMemo(() => {
    const inc = preview.filter(r => r.include);
    const income = inc.filter(r => r.type === 'income').reduce((s, r) => s + r.amount, 0);
    const expense = inc.filter(r => r.type === 'expense').reduce((s, r) => s + r.amount, 0);
    return {
      selected: inc.length,
      total: preview.length,
      income, expense, balance: income - expense,
      duplicates: preview.filter(r => r.isDuplicate).length,
    };
  }, [preview]);

  const runImport = async () => {
    if (!user || !file || !fileType) return;
    const rows = preview.filter(r => r.include);
    if (!rows.length) { toast.error('Selecione ao menos uma linha'); return; }
    setStep('importing');

    // 1) cria import_history
    const { data: hist, error: histErr } = await supabase.from('import_history').insert({
      user_id: user.id,
      file_name: file.name,
      file_type: fileType,
      bank_detected: detected.bank || null,
      records_total: preview.length,
      records_duplicated: summary.duplicates,
      status: 'processing',
    }).select().single();
    if (histErr || !hist) { toast.error('Erro ao registrar importação'); setStep('preview'); return; }

    // 2) aprende regras (linhas onde usuário mudou categoria)
    const learned: { pattern: string; category_id: string }[] = [];
    for (const r of rows) {
      if (r.categoryId && r.categoryId !== r.originalCategoryId) {
        const token = normalizeText(r.description).split(' ').filter(w => w.length >= 4)[0];
        if (token) learned.push({ pattern: token, category_id: r.categoryId });
      }
    }
    if (learned.length) {
      const uniq = Array.from(new Map(learned.map(l => [l.pattern, l])).values())
        .map(l => ({ user_id: user.id, pattern: l.pattern, category_id: l.category_id, match_type: 'contains' as const }));
      await supabase.from('import_rules').upsert(uniq, { onConflict: 'user_id,pattern' });
    }

    // 3) insere em chunks
    let imported = 0;
    let income = 0, expense = 0;
    const CHUNK = 40;
    for (let i = 0; i < rows.length; i += CHUNK) {
      const slice = rows.slice(i, i + CHUNK);
      const inserts = slice.map(r => ({
        user_id: user.id,
        type: r.type,
        amount: r.amount,
        category_id: r.categoryId,
        description: r.description || null,
        date: r.date,
        source: fileType,
        import_id: hist.id,
      }));
      const { data: inserted, error: insErr } = await supabase.from('transactions').insert(inserts).select('id');
      if (insErr) { console.error(insErr); continue; }
      const insertedIds = (inserted || []) as { id: string }[];
      const mapRows = insertedIds.map((t, j) => ({
        user_id: user.id, transaction_id: t.id, import_id: hist.id, external_hash: slice[j].externalHash,
      }));
      if (mapRows.length) await supabase.from('imported_transactions_map').insert(mapRows);
      for (const r of slice) {
        if (r.type === 'income') income += r.amount; else expense += r.amount;
      }
      imported += insertedIds.length;
      setImportedCount(imported);
      setProgress(Math.round((i + slice.length) / rows.length * 100));
      await new Promise(r => setTimeout(r, 0));
    }

    await supabase.from('import_history').update({
      status: imported === rows.length ? 'success' : 'partial',
      records_imported: imported,
      income_total: income,
      expense_total: expense,
    }).eq('id', hist.id);

    try { await supabase.from('security_events').insert({ user_id: user.id, event_type: 'import', metadata: { file_type: fileType, imported } }); } catch {}

    if (refresh) await refresh();
    toast.success(`${imported} lançamentos importados`);
    setStep('done');
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <SettingsSubPageHeader title="Importador Inteligente" description="OFX, CSV e Excel com categorização automática." icon={<Upload size={22} />} />

      <main className="px-4 max-w-3xl mx-auto space-y-5">
        <button onClick={() => navigate('/settings/import/history')} className="text-sm text-primary hover:underline flex items-center gap-1">
          <HistoryIcon size={14} /> Ver histórico de importações
        </button>

        {step === 'choose' && (
          <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {([
              { t: 'ofx', title: 'OFX', desc: 'Extrato bancário padrão' , icon: <FileText size={22} /> },
              { t: 'csv', title: 'CSV', desc: 'Planilha separada por vírgula', icon: <FileSpreadsheet size={22} /> },
              { t: 'xlsx', title: 'Excel', desc: 'Planilha .xlsx / .xls', icon: <FileSpreadsheet size={22} /> },
            ] as { t: FileType; title: string; desc: string; icon: any }[]).map(o => (
              <button key={o.t} onClick={() => { setFileType(o.t); setStep('upload'); }}
                className="card-finance text-left touch-scale hover:border-primary">
                <div className="w-12 h-12 rounded-2xl bg-primary/15 text-primary flex items-center justify-center mb-3">{o.icon}</div>
                <p className="font-semibold">{o.title}</p>
                <p className="text-xs text-muted-foreground">{o.desc}</p>
              </button>
            ))}
          </section>
        )}

        {step === 'upload' && (
          <section className="card-finance space-y-4 animate-fade-in">
            <p className="text-sm text-muted-foreground">Selecione o arquivo {fileType?.toUpperCase()} (máx 10MB).</p>
            <input ref={fileInputRef} type="file" className="hidden"
              accept={fileType === 'ofx' ? '.ofx' : fileType === 'csv' ? '.csv,text/csv' : '.xlsx,.xls'}
              onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
            <button onClick={() => fileInputRef.current?.click()}
              className="w-full py-8 border-2 border-dashed border-border rounded-2xl hover:border-primary touch-scale flex flex-col items-center gap-2">
              <Upload size={28} className="text-primary" />
              <span className="font-medium">Escolher arquivo</span>
              <span className="text-xs text-muted-foreground">{fileType?.toUpperCase()}</span>
            </button>
            <button onClick={resetAll} className="text-sm text-muted-foreground hover:text-foreground">Voltar</button>
          </section>
        )}

        {step === 'map' && (
          <section className="card-finance space-y-3 animate-fade-in">
            <h3 className="font-semibold">Mapear colunas</h3>
            <p className="text-sm text-muted-foreground">Não conseguimos detectar automaticamente. Selecione as colunas:</p>
            {(['date','description','amount','type'] as const).map(field => (
              <label key={field} className="block text-sm">
                <span className="font-medium capitalize">{field === 'date' ? 'Data' : field === 'description' ? 'Descrição' : field === 'amount' ? 'Valor' : 'Tipo (opcional)'}</span>
                <select className="w-full mt-1 rounded-xl border border-border bg-background p-2"
                  value={(mapping as any)?.[field] || ''}
                  onChange={e => setMapping(prev => ({ ...(prev || { date:'', description:'', amount:'' }), [field]: e.target.value }) as CsvMapping)}>
                  <option value="">—</option>
                  {rawHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </label>
            ))}
            <button className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-medium touch-scale"
              disabled={!mapping?.date || !mapping?.description || !mapping?.amount}
              onClick={() => mapping && runMapping(mapping, rawRows)}>
              Continuar
            </button>
          </section>
        )}

        {step === 'preview' && (
          <section className="space-y-4 animate-fade-in">
            <div className="card-finance grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              <div><p className="text-muted-foreground text-xs">Selecionados</p><p className="font-bold">{summary.selected}/{summary.total}</p></div>
              <div><p className="text-muted-foreground text-xs">Receitas</p><p className="font-bold text-success">{formatCurrency(summary.income)}</p></div>
              <div><p className="text-muted-foreground text-xs">Despesas</p><p className="font-bold text-destructive">{formatCurrency(summary.expense)}</p></div>
              <div><p className="text-muted-foreground text-xs">Duplicados</p><p className="font-bold">{summary.duplicates}</p></div>
            </div>

            {detected.bank && <p className="text-xs text-muted-foreground">Banco detectado: <b>{detected.bank}</b>{detected.period ? ` • ${detected.period}` : ''}</p>}

            <div className="card-finance overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs text-muted-foreground border-b border-border">
                  <tr>
                    <th className="p-2 text-left">✓</th>
                    <th className="p-2 text-left">Data</th>
                    <th className="p-2 text-left">Descrição</th>
                    <th className="p-2 text-left">Categoria</th>
                    <th className="p-2 text-right">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.slice(0, 200).map(r => (
                    <tr key={r.id} className={`border-b border-border/50 ${r.isDuplicate ? 'opacity-60' : ''}`}>
                      <td className="p-2">
                        <input type="checkbox" checked={r.include} onChange={e => setPreview(prev => prev.map(x => x.id === r.id ? { ...x, include: e.target.checked } : x))} />
                      </td>
                      <td className="p-2 whitespace-nowrap">{r.date}</td>
                      <td className="p-2">
                        <div className="truncate max-w-[180px]" title={r.description}>{r.description}</div>
                        {r.isDuplicate && <span className="text-[10px] bg-warning/15 text-warning px-1.5 py-0.5 rounded">duplicado</span>}
                      </td>
                      <td className="p-2">
                        <select value={r.categoryId || ''}
                          onChange={e => setPreview(prev => prev.map(x => x.id === r.id ? { ...x, categoryId: e.target.value || null } : x))}
                          className="rounded-lg border border-border bg-background p-1 text-xs">
                          <option value="">—</option>
                          {(categories || []).filter((c: any) => c.type === r.type).map((c: any) => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                      </td>
                      <td className={`p-2 text-right whitespace-nowrap font-medium ${r.type === 'income' ? 'text-success' : 'text-destructive'}`}>
                        {r.type === 'income' ? '+' : '-'}{formatCurrency(r.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {preview.length > 200 && <p className="text-xs text-muted-foreground text-center py-2">Mostrando 200 de {preview.length}. Todas serão importadas.</p>}
            </div>

            <div className="flex gap-2">
              <button onClick={resetAll} className="flex-1 py-3 rounded-xl bg-secondary touch-scale">Cancelar</button>
              <button onClick={runImport} className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground font-medium touch-scale">
                Importar {summary.selected}
              </button>
            </div>
          </section>
        )}

        {step === 'importing' && (
          <section className="card-finance space-y-4 animate-fade-in text-center py-10">
            <Loader2 size={36} className="mx-auto animate-spin text-primary" />
            <p className="font-semibold">Importando…</p>
            <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
              <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
            </div>
            <p className="text-sm text-muted-foreground">{importedCount} lançamentos • {progress}%</p>
          </section>
        )}

        {step === 'done' && (
          <section className="card-finance space-y-4 animate-fade-in text-center py-10">
            <div className="w-16 h-16 rounded-full bg-success/15 text-success flex items-center justify-center mx-auto">
              <Check size={32} />
            </div>
            <p className="font-semibold text-lg">Importação concluída</p>
            <p className="text-sm text-muted-foreground">{importedCount} lançamentos adicionados ao seu Finango.</p>
            <div className="flex gap-2 justify-center">
              <button onClick={() => navigate('/')} className="py-3 px-6 rounded-xl bg-primary text-primary-foreground font-medium touch-scale">Ir ao dashboard</button>
              <button onClick={resetAll} className="py-3 px-6 rounded-xl bg-secondary touch-scale">Nova importação</button>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
