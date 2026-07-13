import { Download, FileText, FileSpreadsheet, FileJson, UploadCloud, DatabaseBackup, HardDriveDownload } from 'lucide-react';
import { SettingsSubPageHeader } from '@/components/settings/SettingsSubPageHeader';
import { SettingRow } from '@/components/settings/SettingRow';
import { useEffectiveFinance } from '@/hooks/useEffectiveFinance';
import { toast } from 'sonner';

export default function DataSettings() {
  const finance = useEffectiveFinance();

  const soon = () => toast.info('Em breve');

  const exportJSON = () => {
    try {
      const data = {
        exportedAt: new Date().toISOString(),
        transactions: finance.transactions ?? [],
        goals: (finance as any).goals ?? [],
        categories: (finance as any).categories ?? [],
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `finango-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Backup exportado com sucesso');
    } catch {
      toast.error('Erro ao exportar backup');
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <SettingsSubPageHeader title="Importar e Exportar" description="Leve seus dados para onde quiser." icon={<Download size={22} />} />
      <main className="px-4 space-y-5 max-w-3xl mx-auto">
        <section className="card-finance">
          <h2 className="font-semibold mb-3">Exportar</h2>
          <div className="space-y-1.5">
            <SettingRow icon={<FileText size={18} />} label="Exportar PDF" description="Relatório visual" onClick={soon} badge="Em breve" />
            <SettingRow icon={<FileSpreadsheet size={18} />} label="Exportar Excel" description="Planilha .xlsx" onClick={soon} badge="Em breve" />
            <SettingRow icon={<FileSpreadsheet size={18} />} label="Exportar CSV" description="Dados separados por vírgula" onClick={soon} badge="Em breve" />
            <SettingRow icon={<FileJson size={18} />} label="Backup completo (JSON)" description="Todos os seus dados" onClick={exportJSON} highlight />
          </div>
        </section>
        <section className="card-finance">
          <h2 className="font-semibold mb-3">Importar</h2>
          <div className="space-y-1.5">
            <SettingRow icon={<DatabaseBackup size={18} />} label="Restaurar backup" description="Carregar arquivo JSON" onClick={soon} badge="Em breve" />
            <SettingRow icon={<UploadCloud size={18} />} label="Importar dados" description="Planilhas e extratos" onClick={soon} badge="Em breve" />
            <SettingRow icon={<HardDriveDownload size={18} />} label="Migrar de outro app" description="Assistente de migração" onClick={soon} badge="Em breve" />
          </div>
        </section>
      </main>
    </div>
  );
}
