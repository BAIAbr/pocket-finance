import { HelpCircle, MessageCircle, LifeBuoy, Bug, Lightbulb, Star, Mail, Instagram } from 'lucide-react';
import { SettingsSubPageHeader } from '@/components/settings/SettingsSubPageHeader';
import { SettingRow } from '@/components/settings/SettingRow';

const SUPPORT_EMAIL = 'suporte@finango.online';
const INSTAGRAM_URL = 'https://instagram.com/finango.finance';

export default function HelpSettings() {
  const openMail = (subject: string) => {
    window.location.href = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}`;
  };
  return (
    <div className="min-h-screen bg-background pb-24">
      <SettingsSubPageHeader title="Ajuda e Suporte" description="Estamos aqui para ajudar." icon={<HelpCircle size={22} />} />
      <main className="px-4 space-y-5 max-w-3xl mx-auto">
        <section className="card-finance">
          <h2 className="font-semibold mb-3">Suporte</h2>
          <div className="space-y-1.5">
            <SettingRow icon={<LifeBuoy size={18} />} label="Central de Ajuda" description="Guias e tutoriais" onClick={() => window.open('https://finango.online/ajuda', '_blank')} />
            <SettingRow icon={<HelpCircle size={18} />} label="Perguntas Frequentes" description="Respostas rápidas" onClick={() => window.open('https://finango.online/faq', '_blank')} />
            <SettingRow icon={<MessageCircle size={18} />} label="Falar com o suporte" description={SUPPORT_EMAIL} onClick={() => openMail('Suporte Finango')} highlight />
          </div>
        </section>
        <section className="card-finance">
          <h2 className="font-semibold mb-3">Feedback</h2>
          <div className="space-y-1.5">
            <SettingRow icon={<Bug size={18} />} label="Reportar problema" description="Encontrou um bug?" onClick={() => openMail('Bug — Finango')} />
            <SettingRow icon={<Lightbulb size={18} />} label="Enviar sugestão" description="Ideias para o app" onClick={() => openMail('Sugestão — Finango')} />
            <SettingRow icon={<Star size={18} />} label="Avaliar o aplicativo" description="Deixe sua nota" onClick={() => window.open('https://finango.online', '_blank')} />
          </div>
        </section>
        <section className="card-finance">
          <h2 className="font-semibold mb-3">Contato</h2>
          <div className="space-y-1.5">
            <SettingRow icon={<Mail size={18} />} label="E-mail oficial" description={SUPPORT_EMAIL} onClick={() => openMail('Contato Finango')} />
            <SettingRow icon={<Instagram size={18} />} label="Instagram oficial" description="@finango.finance" onClick={() => window.open(INSTAGRAM_URL, '_blank')} />
          </div>
        </section>
      </main>
    </div>
  );
}
