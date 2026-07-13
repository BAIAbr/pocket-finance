import { Globe, Languages, DollarSign, Calendar, Hash, Clock } from 'lucide-react';
import { SettingsSubPageHeader } from '@/components/settings/SettingsSubPageHeader';
import { useUserPreferences } from '@/contexts/UserPreferencesContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function PreferenceSettings() {
  const { regional, setRegional } = useUserPreferences();

  const update = <K extends keyof typeof regional>(key: K, value: typeof regional[K]) => {
    setRegional({ ...regional, [key]: value });
  };

  const Row = ({ icon, label, description, children }: { icon: React.ReactNode; label: string; description?: string; children: React.ReactNode }) => (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-secondary/40">
      <div className="w-10 h-10 rounded-xl bg-secondary text-foreground flex items-center justify-center shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{label}</p>
        {description && <p className="text-[11px] text-muted-foreground">{description}</p>}
      </div>
      <div className="w-40 shrink-0">{children}</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background pb-24">
      <SettingsSubPageHeader title="Preferências" description="Idioma, moeda e formatos regionais." icon={<Globe size={22} />} />
      <main className="px-4 space-y-5 max-w-3xl mx-auto">
        <section className="card-finance">
          <h2 className="font-semibold mb-3">Regional</h2>
          <div className="space-y-2">
            <Row icon={<Languages size={18} />} label="Idioma">
              <Select value={regional.language} onValueChange={(v) => update('language', v as typeof regional.language)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pt-BR">Português (BR)</SelectItem>
                  <SelectItem value="en-US">English (US)</SelectItem>
                  <SelectItem value="es-ES">Español</SelectItem>
                </SelectContent>
              </Select>
            </Row>
            <Row icon={<DollarSign size={18} />} label="Moeda">
              <Select value={regional.currency} onValueChange={(v) => update('currency', v as typeof regional.currency)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="BRL">Real (BRL)</SelectItem>
                  <SelectItem value="USD">Dólar (USD)</SelectItem>
                  <SelectItem value="EUR">Euro (EUR)</SelectItem>
                </SelectContent>
              </Select>
            </Row>
            <Row icon={<Calendar size={18} />} label="Formato de data">
              <Select value={regional.dateFormat} onValueChange={(v) => update('dateFormat', v as typeof regional.dateFormat)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="dd/MM/yyyy">dd/mm/aaaa</SelectItem>
                  <SelectItem value="MM/dd/yyyy">mm/dd/aaaa</SelectItem>
                  <SelectItem value="yyyy-MM-dd">aaaa-mm-dd</SelectItem>
                </SelectContent>
              </Select>
            </Row>
            <Row icon={<Calendar size={18} />} label="Início da semana">
              <Select value={regional.weekStart} onValueChange={(v) => update('weekStart', v as typeof regional.weekStart)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="sunday">Domingo</SelectItem>
                  <SelectItem value="monday">Segunda</SelectItem>
                </SelectContent>
              </Select>
            </Row>
            <Row icon={<Clock size={18} />} label="Fuso horário">
              <Select value={regional.timezone} onValueChange={(v) => update('timezone', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="America/Sao_Paulo">Brasília (GMT-3)</SelectItem>
                  <SelectItem value="America/Manaus">Manaus (GMT-4)</SelectItem>
                  <SelectItem value="America/New_York">Nova York (GMT-5)</SelectItem>
                  <SelectItem value="Europe/Lisbon">Lisboa (GMT+0)</SelectItem>
                </SelectContent>
              </Select>
            </Row>
            <Row icon={<Hash size={18} />} label="Formato numérico">
              <Select value={regional.numberFormat} onValueChange={(v) => update('numberFormat', v as typeof regional.numberFormat)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pt-BR">1.234,56 (BR)</SelectItem>
                  <SelectItem value="en-US">1,234.56 (US)</SelectItem>
                </SelectContent>
              </Select>
            </Row>
          </div>
        </section>
      </main>
    </div>
  );
}
