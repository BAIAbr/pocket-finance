import { Info, FileText, ShieldCheck, Instagram, Globe, History } from 'lucide-react';
import { SettingsSubPageHeader } from '@/components/settings/SettingsSubPageHeader';
import { SettingRow } from '@/components/settings/SettingRow';

const CHANGELOG = [
  { version: '2.2.0', date: 'Jul 2026', highlights: 'Central de Configurações Premium, Investimentos, Planejamento inteligente.' },
  { version: '2.1.0', date: 'Jun 2026', highlights: 'Family Mode, Cofrinho multi-moeda, missões semanais.' },
  { version: '2.0.0', date: 'Mai 2026', highlights: 'Nova identidade visual, IA financeira, temas customizáveis.' },
];

export default function AboutSettings() {
  return (
    <div className="min-h-screen bg-background pb-24">
      <SettingsSubPageHeader title="Sobre" description="Informações do aplicativo." icon={<Info size={22} />} />
      <main className="px-4 space-y-5 max-w-3xl mx-auto">
        <section className="card-finance">
          <div className="flex items-center justify-between py-1.5">
            <span className="text-muted-foreground text-sm">Versão</span>
            <span className="font-mono text-sm">2.2.0</span>
          </div>
          <div className="flex items-center justify-between py-1.5">
            <span className="text-muted-foreground text-sm">Ambiente</span>
            <span className="font-mono text-sm">Produção</span>
          </div>
        </section>

        <section className="card-finance">
          <h2 className="font-semibold mb-3 flex items-center gap-2"><History size={18} /> Histórico de atualizações</h2>
          <div className="space-y-3">
            {CHANGELOG.map(c => (
              <div key={c.version} className="p-3 rounded-xl bg-secondary/40">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono text-sm font-semibold">v{c.version}</span>
                  <span className="text-[11px] text-muted-foreground">{c.date}</span>
                </div>
                <p className="text-xs text-muted-foreground">{c.highlights}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="card-finance">
          <h2 className="font-semibold mb-3">Legal</h2>
          <div className="space-y-1.5">
            <SettingRow icon={<ShieldCheck size={18} />} label="Política de Privacidade" onClick={() => window.open('https://finango.online/privacidade', '_blank')} />
            <SettingRow icon={<FileText size={18} />} label="Termos de Uso" onClick={() => window.open('https://finango.online/termos', '_blank')} />
            <SettingRow icon={<FileText size={18} />} label="Licenças" description="Software open-source" onClick={() => window.open('https://finango.online/licencas', '_blank')} />
          </div>
        </section>

        <section className="card-finance">
          <h2 className="font-semibold mb-3">Links</h2>
          <div className="space-y-1.5">
            <SettingRow icon={<Globe size={18} />} label="Site Oficial" description="finango.online" onClick={() => window.open('https://finango.online', '_blank')} />
            <SettingRow icon={<Instagram size={18} />} label="Instagram Oficial" description="@finango.finance" onClick={() => window.open('https://instagram.com/finango.finance', '_blank')} />
          </div>
        </section>
      </main>
    </div>
  );
}
