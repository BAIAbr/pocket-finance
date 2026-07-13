import { FlaskConical } from 'lucide-react';
import { SettingsSubPageHeader } from '@/components/settings/SettingsSubPageHeader';
import { useUserPreferences, type LabFlags } from '@/contexts/UserPreferencesContext';
import { Switch } from '@/components/ui/switch';

const LABS: { key: keyof LabFlags; label: string; description: string; emoji: string }[] = [
  { key: 'newDashboard', label: 'Novo Dashboard', description: 'Interface renovada em testes', emoji: '🧭' },
  { key: 'newPlanning', label: 'Novo Planejamento', description: 'Assistente inteligente de metas', emoji: '🎯' },
  { key: 'financialRadar', label: 'Radar Financeiro', description: 'Detecção proativa de anomalias', emoji: '📡' },
  { key: 'financialHealth', label: 'Saúde Financeira', description: 'Diagnóstico com nota 0-100', emoji: '❤️‍🩹' },
  { key: 'foxAssistant', label: 'Assistente da Raposa', description: 'Sugestões contextuais', emoji: '🦊' },
];

export default function LabsSettings() {
  const { labs, setLab } = useUserPreferences();
  return (
    <div className="min-h-screen bg-background pb-24">
      <SettingsSubPageHeader
        title="Laboratório Finango"
        description="Teste novos recursos antes do lançamento oficial."
        icon={<FlaskConical size={22} />}
      />
      <main className="px-4 space-y-5 max-w-3xl mx-auto">
        <section className="card-finance bg-primary/5 border border-primary/20">
          <p className="text-sm">
            Recursos experimentais podem estar instáveis. Você pode ativar ou desativar a qualquer momento.
          </p>
        </section>
        <section className="card-finance">
          <div className="space-y-1.5">
            {LABS.map(l => (
              <div key={l.key} className="flex items-center gap-3 p-3 rounded-xl bg-secondary/40">
                <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center text-xl shrink-0">
                  {l.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{l.label}</p>
                  <p className="text-xs text-muted-foreground">{l.description}</p>
                </div>
                <Switch checked={labs[l.key]} onCheckedChange={(v) => setLab(l.key, v)} />
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
