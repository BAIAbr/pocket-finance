import { useNavigate } from 'react-router-dom';
import { Download, FileText, FileSpreadsheet, FileJson, UploadCloud, DatabaseBackup, HardDriveDownload, Upload } from 'lucide-react';
import { SettingsSubPageHeader } from '@/components/settings/SettingsSubPageHeader';
import { SettingRow } from '@/components/settings/SettingRow';
import { useEffectiveFinance } from '@/hooks/useEffectiveFinance';
import { toast } from 'sonner';
import { exportCSV, exportXLSX, exportPDF, exportJSON, type ExportTx } from '@/lib/import/exporters';
import { useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export default function DataSettings() {
  const finance = useEffectiveFinance() as any;
  const navigate = useNavigate();
  const { user } = useAuth();
  const restoreInput = useRef<HTMLInputElement>(null);
  const [restoring, setRestoring] = useState(false);

  const buildExportRows = (): ExportTx[] => {
    const cats = (finance.categories || []) as any[];
    const byId: Record<string, string> = {};
    cats.forEach(c => { byId[c.id] = c.name; });
    return ((finance.transactions || []) as any[]).map(t => ({
      date: t.date,
      type: t.type,
      amount: Number(t.amount),
      description: t.description,
      category_name: byId[t.category_id] || null,
    }));
  };

  const handleCSV = () => { exportCSV(buildExportRows()); toast.success('CSV exportado'); };
  const handleXLSX = () => { exportXLSX(buildExportRows()); toast.success('Excel exportado'); };
  const handlePDF = () => { exportPDF(buildExportRows()); toast.success('PDF exportado'); };

  const handleBackup = () => {
    const payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      transactions: finance.transactions ?? [],
      goals: finance.savingsGoals ?? [],
      categories: finance.categories ?? [],
      piggyBanks: finance.piggyBanks ?? [],
      piggyBankTransactions: finance.piggyBankTransactions ?? [],
    };
    exportJSON(payload, `finango-backup-${new Date().toISOString().slice(0,10)}.json`);
    toast.success('Backup exportado');
  };

  const handleRestore = async (file: File) => {
    if (!user) return;
    setRestoring(true);
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (!data || !Array.isArray(data.transactions)) throw new Error('Formato inválido');
      const mode = confirm('Mesclar dados? (OK = mesclar / Cancelar = apenas visualizar)');
      if (!mode) { toast.info('Restauração cancelada'); return; }

      // Categorias primeiro (mapa antigo->novo)
      const catMap: Record<string, string> = {};
      for (const c of (data.categories || []) as any[]) {
        const existing = (finance.categories || []).find((x: any) => x.name === c.name && x.type === c.type);
        if (existing) { catMap[c.id] = existing.id; continue; }
        const { data: ins } = await supabase.from('categories').insert({
          user_id: user.id, name: c.name, icon: c.icon || 'Plus', color: c.color || '#7C3AED', type: c.type, is_default: false,
        }).select().single();
        if (ins) catMap[c.id] = (ins as any).id;
      }

      let inserted = 0;
      const CHUNK = 50;
      const txs = (data.transactions || []) as any[];
      for (let i = 0; i < txs.length; i += CHUNK) {
        const slice = txs.slice(i, i + CHUNK).map(t => ({
          user_id: user.id,
          type: t.type, amount: Number(t.amount),
          category_id: catMap[t.category_id] || null,
          description: t.description || null,
          date: t.date, source: 'backup',
        }));
        const { data: r } = await supabase.from('transactions').insert(slice).select('id');
        inserted += (r || []).length;
      }
      toast.success(`${inserted} lançamentos restaurados`);
      if (finance.refresh) await finance.refresh();
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao restaurar');
    } finally {
      setRestoring(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <SettingsSubPageHeader title="Importar e Exportar" description="Leve seus dados para onde quiser." icon={<Download size={22} />} />
      <main className="px-4 space-y-5 max-w-3xl mx-auto">
        <section className="card-finance">
          <h2 className="font-semibold mb-3">Importador Inteligente</h2>
          <div className="space-y-1.5">
            <SettingRow icon={<Upload size={18} />} label="Importar OFX / CSV / Excel" description="Assistente com categorização automática" onClick={() => navigate('/settings/import')} highlight />
            <SettingRow icon={<HardDriveDownload size={18} />} label="Histórico de importações" description="Ver e reverter importações" onClick={() => navigate('/settings/import/history')} />
          </div>
        </section>

        <section className="card-finance">
          <h2 className="font-semibold mb-3">Exportar</h2>
          <div className="space-y-1.5">
            <SettingRow icon={<FileText size={18} />} label="Exportar PDF" description="Relatório visual" onClick={handlePDF} />
            <SettingRow icon={<FileSpreadsheet size={18} />} label="Exportar Excel" description="Planilha .xlsx" onClick={handleXLSX} />
            <SettingRow icon={<FileSpreadsheet size={18} />} label="Exportar CSV" description="Dados separados por vírgula" onClick={handleCSV} />
            <SettingRow icon={<FileJson size={18} />} label="Backup completo (JSON)" description="Todos os seus dados" onClick={handleBackup} highlight />
          </div>
        </section>

        <section className="card-finance">
          <h2 className="font-semibold mb-3">Restaurar</h2>
          <input ref={restoreInput} type="file" accept="application/json,.json" className="hidden"
            onChange={e => e.target.files?.[0] && handleRestore(e.target.files[0])} />
          <SettingRow icon={<DatabaseBackup size={18} />} label={restoring ? 'Restaurando…' : 'Restaurar backup'} description="Carregar arquivo JSON" onClick={() => !restoring && restoreInput.current?.click()} />
        </section>
      </main>
    </div>
  );
}
