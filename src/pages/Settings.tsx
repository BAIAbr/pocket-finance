import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useAdminCheck } from '@/hooks/useAdminCheck';
import { useFinanceContext } from '@/contexts/FinanceContext';
import { useSubscription } from '@/hooks/useSubscription';
import { entitledPlanCode } from '@/lib/planCapabilities';
import { useNavigate } from 'react-router-dom';
import {
  Palette, Bell, Shield, CreditCard, FlaskConical,
  HelpCircle, Info, ShieldCheck, Trash2, User, Database, ChevronRight,
} from 'lucide-react';
import { SettingRow } from '@/components/settings/SettingRow';
import { toast } from 'sonner';

interface Row {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  to: string;
  badge?: string;
}

interface Group {
  title: string;
  rows: Row[];
}

export default function SettingsPage() {
  const { user, profile, isAuthenticated } = useAuth();
  const { isAdmin } = useAdminCheck(user?.id);
  const { clearAllData } = useFinanceContext();
  const { plans, subscription } = useSubscription(user?.id);
  const navigate = useNavigate();
  const [showConfirmClear, setShowConfirmClear] = useState(false);

  const planCode = entitledPlanCode(subscription as any);
  const planName = plans.find(p => p.code === planCode)?.name ?? (planCode === 'free' ? 'Gratuito' : planCode);
  const displayName = profile?.name || user?.email?.split('@')[0] || 'Usuário';
  const initial = displayName.charAt(0).toUpperCase();

  const groups: Group[] = [
    {
      title: 'Conta',
      rows: [
        { id: 'profile', label: 'Perfil', description: 'Nome, foto e conquistas.', icon: <User size={18} />, to: '/profile' },
        { id: 'data', label: 'Dados', description: 'Importação e exportação dos seus dados.', icon: <Database size={18} />, to: '/settings/data' },
      ],
    },
    {
      title: 'Preferências',
      rows: [
        { id: 'appearance', label: 'Aparência e preferências', description: 'Tema, idioma, moeda, formato de data e outras preferências.', icon: <Palette size={18} />, to: '/settings/appearance' },
        { id: 'notifications', label: 'Notificações', description: 'Push, resumos e categorias.', icon: <Bell size={18} />, to: '/settings/notifications' },
      ],
    },
    {
      title: 'Segurança e plano',
      rows: [
        { id: 'security', label: 'Segurança', description: 'Senha, sessões e dispositivos.', icon: <Shield size={18} />, to: '/security' },
        { id: 'subscription', label: 'Meu plano', description: 'Plano atual, benefícios e assinatura.', icon: <CreditCard size={18} />, to: '/settings/subscription', badge: planName },
      ],
    },
    {
      title: 'Ajuda',
      rows: [
        { id: 'help', label: 'Ajuda e suporte', description: 'Central de ajuda, contato e feedback.', icon: <HelpCircle size={18} />, to: '/settings/help' },
        { id: 'about', label: 'Sobre', description: 'Versão, changelog, políticas e licenças.', icon: <Info size={18} />, to: '/settings/about' },
      ],
    },
  ];

  // Laboratório e Painel administrativo: visíveis apenas para administradores (regra existente useAdminCheck).
  const adminRows: Row[] = isAuthenticated && isAdmin ? [
    { id: 'admin', label: 'Painel administrativo', description: 'Ferramentas de admin do Finango.', icon: <ShieldCheck size={18} />, to: '/admin', badge: 'Admin' },
    { id: 'labs', label: 'Laboratório Finango', description: 'Recursos experimentais em teste.', icon: <FlaskConical size={18} />, to: '/settings/labs' },
  ] : [];

  return (
    <div className="min-h-screen bg-background pb-24 safe-top">
      <header className="px-4 pt-6 pb-4 max-w-3xl mx-auto">
        <p className="text-[11px] font-mono font-semibold uppercase tracking-[0.18em] text-primary">Configurações</p>
        <h1 className="text-2xl font-bold mt-1">Sua conta</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Gerencie sua conta, preferências e segurança.
        </p>
      </header>

      <main className="px-4 space-y-6 max-w-3xl mx-auto">
        {isAuthenticated && (
          <button
            onClick={() => navigate('/profile')}
            className="card-finance w-full flex items-center gap-4 text-left touch-scale hover:border-primary/40 transition-colors"
          >
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="w-14 h-14 rounded-full object-cover ring-2 ring-primary/30 shrink-0" />
            ) : (
              <div className="w-14 h-14 rounded-full bg-primary/15 text-primary flex items-center justify-center text-xl font-bold shrink-0">
                {initial}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-semibold truncate">{displayName}</p>
              <p className="text-xs text-muted-foreground truncate">{profile?.email || user?.email}</p>
              <span className="inline-block mt-1.5 text-[10px] font-mono font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md bg-primary/15 text-primary">
                {planName}
              </span>
            </div>
            <ChevronRight size={18} className="text-muted-foreground shrink-0" />
          </button>
        )}

        {groups.map(g => (
          <section key={g.title}>
            <h2 className="px-1 mb-2 text-[11px] font-mono font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              {g.title}
            </h2>
            <div className="card-finance p-1.5 divide-y divide-border/50">
              {g.rows.map(r => (
                <SettingRow
                  key={r.id}
                  icon={r.icon}
                  label={r.label}
                  description={r.description}
                  badge={r.badge}
                  onClick={() => navigate(r.to)}
                />
              ))}
            </div>
          </section>
        ))}

        {adminRows.length > 0 && (
          <section className="pt-2">
            <h2 className="px-1 mb-2 text-[11px] font-mono font-semibold uppercase tracking-[0.16em] text-muted-foreground/70">
              Administração
            </h2>
            <div className="rounded-2xl border border-dashed border-border p-1.5 divide-y divide-border/50">
              {adminRows.map(r => (
                <SettingRow key={r.id} icon={r.icon} label={r.label} description={r.description} badge={r.badge} onClick={() => navigate(r.to)} />
              ))}
            </div>
          </section>
        )}

        {/* Família: removida da interface (backend preservado) */}

        {isAuthenticated && (
          <section className="pt-6 mt-2 border-t border-border/50">
            <h2 className="px-1 mb-2 text-[11px] font-mono font-semibold uppercase tracking-[0.16em] text-destructive">
              Zona de perigo
            </h2>
            <div className="card-finance p-1.5 border border-destructive/20">
              {showConfirmClear ? (
                <div className="space-y-3 p-2">
                  <p className="text-sm text-destructive">
                    Isso apagará todas as suas transações e metas. Esta ação não pode ser desfeita.
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowConfirmClear(false)}
                      className="flex-1 py-3 rounded-xl bg-secondary font-medium touch-scale"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={async () => {
                        await clearAllData();
                        setShowConfirmClear(false);
                        toast.success('Dados limpos');
                      }}
                      className="flex-1 py-3 rounded-xl bg-destructive text-destructive-foreground font-medium touch-scale"
                    >
                      Confirmar
                    </button>
                  </div>
                </div>
              ) : (
                <SettingRow
                  danger
                  icon={<Trash2 size={18} />}
                  label="Limpar todos os dados"
                  description="Ação irreversível"
                  onClick={() => setShowConfirmClear(true)}
                  trailing={null as any}
                />
              )}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
