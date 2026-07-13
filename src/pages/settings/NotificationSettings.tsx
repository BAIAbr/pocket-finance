import { Bell, BellOff } from 'lucide-react';
import { SettingsSubPageHeader } from '@/components/settings/SettingsSubPageHeader';
import { useUserPreferences, type NotificationPrefs } from '@/contexts/UserPreferencesContext';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useAuth } from '@/contexts/AuthContext';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

const CATEGORIES: { key: keyof NotificationPrefs; label: string; description: string }[] = [
  { key: 'incomes', label: 'Receitas', description: 'Novos ganhos e depósitos' },
  { key: 'expenses', label: 'Despesas', description: 'Novas saídas registradas' },
  { key: 'goals', label: 'Metas', description: 'Progresso e conclusão de metas' },
  { key: 'planning', label: 'Planejamento', description: 'Alertas do planejamento financeiro' },
  { key: 'investments', label: 'Investimentos', description: 'Movimentos e proventos' },
  { key: 'cards', label: 'Cartões', description: 'Faturas e vencimentos' },
  { key: 'subscriptions', label: 'Assinaturas', description: 'Cobranças recorrentes' },
  { key: 'upcomingBills', label: 'Contas a vencer', description: 'Lembretes 3 dias antes' },
  { key: 'weeklyDigest', label: 'Resumo Semanal', description: 'Todo domingo pela manhã' },
  { key: 'monthlyDigest', label: 'Resumo Mensal', description: 'Fechamento do mês' },
  { key: 'news', label: 'Novidades', description: 'Novos recursos do Finango' },
  { key: 'updates', label: 'Atualizações', description: 'Melhorias e correções' },
];

export default function NotificationSettings() {
  const { user, isAuthenticated } = useAuth();
  const { notifications, setNotification } = useUserPreferences();
  const { isSupported, isSubscribed, isLoading, subscribe, unsubscribe } = usePushNotifications(user?.id);

  return (
    <div className="min-h-screen bg-background pb-24">
      <SettingsSubPageHeader title="Notificações" description="Escolha o que deseja receber e como." icon={<Bell size={22} />} />
      <main className="px-4 space-y-5 max-w-3xl mx-auto">
        {isAuthenticated && isSupported && (
          <section className="card-finance">
            <h2 className="font-semibold mb-3">Notificações push</h2>
            <div className="flex items-center justify-between p-3 rounded-xl bg-secondary/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/15 text-primary flex items-center justify-center">
                  {isSubscribed ? <Bell size={18} /> : <BellOff size={18} />}
                </div>
                <div>
                  <p className="font-medium text-sm">Push neste dispositivo</p>
                  <p className="text-xs text-muted-foreground">{isSubscribed ? 'Ativadas' : 'Receba lembretes e resumos'}</p>
                </div>
              </div>
              <button
                onClick={() => (isSubscribed ? unsubscribe() : subscribe())}
                disabled={isLoading}
                className={cn(
                  'px-3 py-2 rounded-xl text-sm font-semibold touch-scale',
                  isSubscribed ? 'bg-secondary hover:bg-secondary/70' : 'bg-primary text-primary-foreground hover:bg-primary/90',
                )}
              >
                {isLoading ? '...' : isSubscribed ? 'Desativar' : 'Ativar'}
              </button>
            </div>
          </section>
        )}

        <section className="card-finance">
          <h2 className="font-semibold mb-3">Categorias</h2>
          <div className="space-y-1.5">
            {CATEGORIES.map(c => (
              <div key={c.key} className="flex items-center justify-between p-3 rounded-xl bg-secondary/40">
                <div className="min-w-0 flex-1 pr-3">
                  <p className="text-sm font-medium">{c.label}</p>
                  <p className="text-xs text-muted-foreground">{c.description}</p>
                </div>
                <Switch
                  checked={notifications[c.key]}
                  onCheckedChange={(v) => setNotification(c.key, v)}
                />
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
