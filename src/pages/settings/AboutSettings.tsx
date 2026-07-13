import { Info, FileText, ShieldCheck, Instagram, Globe, History, Sparkles, Cookie } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { SettingsSubPageHeader } from '@/components/settings/SettingsSubPageHeader';
import { SettingRow } from '@/components/settings/SettingRow';

export default function AboutSettings() {
  const navigate = useNavigate();
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
          <h2 className="font-semibold mb-3 flex items-center gap-2"><History size={18} /> Novidades e atualizações</h2>
          <SettingRow
            icon={<Sparkles size={18} />}
            label="Ver todas as novidades"
            description="Timeline completo de melhorias, correções e recursos."
            onClick={() => navigate('/novidades')}
          />
        </section>

        <section className="card-finance">
          <h2 className="font-semibold mb-3">Legal</h2>
          <div className="space-y-1.5">
            <SettingRow icon={<ShieldCheck size={18} />} label="Política de Privacidade" onClick={() => navigate('/d/politica-de-privacidade')} />
            <SettingRow icon={<FileText size={18} />} label="Termos de Uso" onClick={() => navigate('/d/termos-de-uso')} />
            <SettingRow icon={<Cookie size={18} />} label="Política de Cookies" onClick={() => navigate('/d/politica-de-cookies')} />
            <SettingRow icon={<Info size={18} />} label="Sobre o Finango" onClick={() => navigate('/d/sobre')} />
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

