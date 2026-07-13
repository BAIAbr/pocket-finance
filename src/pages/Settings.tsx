import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useAdminCheck } from '@/hooks/useAdminCheck';
import { useFinanceContext } from '@/contexts/FinanceContext';
import { useNavigate } from 'react-router-dom';
import {
  Palette, Bell, Shield, CreditCard, Download, Globe, FlaskConical,
  HelpCircle, Info, Users, ShieldCheck, Trash2, ChevronRight,
} from 'lucide-react';
import { SettingsCategoryCard } from '@/components/settings/SettingsCategoryCard';
import { FamilySettings } from '@/components/FamilySettings';
import { PlanGate } from '@/components/PlanGate';
import { toast } from 'sonner';

interface Category {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  onClick: () => void;
  accentClass: string;
}

export default function SettingsPage() {
  const { user, isAuthenticated } = useAuth();
  const { isAdmin } = useAdminCheck(user?.id);
  const { clearAllData } = useFinanceContext();
  const navigate = useNavigate();
  const [showConfirmClear, setShowConfirmClear] = useState(false);
  const [showFamily, setShowFamily] = useState(false);

  const categories: Category[] = [
    {
      id: 'appearance',
      title: 'Personalização',
      description: 'Customize a aparência e a organização do Finango.',
      icon: <Palette size={26} />,
      onClick: () => navigate('/settings/appearance'),
      accentClass: 'bg-primary/15 text-primary',
    },
    {
      id: 'notifications',
      title: 'Notificações',
      description: 'Push, resumos e categorias.',
      icon: <Bell size={26} />,
      onClick: () => navigate('/settings/notifications'),
      accentClass: 'bg-warning/15 text-warning',
    },
    {
      id: 'security',
      title: 'Segurança',
      description: 'Senha, 2FA, sessões e dispositivos.',
      icon: <Shield size={26} />,
      onClick: () => navigate('/security'),
      accentClass: 'bg-success/15 text-success',
    },
    {
      id: 'subscription',
      title: 'Assinatura e Contas',
      description: 'Plano Finango, pagamentos e conexões.',
      icon: <CreditCard size={26} />,
      onClick: () => navigate('/settings/subscription'),
      accentClass: 'bg-primary/15 text-primary',
    },
    {
      id: 'data',
      title: 'Importar e Exportar',
      description: 'Backup, PDF, Excel, CSV e migrações.',
      icon: <Download size={26} />,
      onClick: () => navigate('/settings/data'),
      accentClass: 'bg-secondary text-foreground',
    },
    {
      id: 'preferences',
      title: 'Preferências',
      description: 'Idioma, moeda, formato de data e fuso.',
      icon: <Globe size={26} />,
      onClick: () => navigate('/settings/preferences'),
      accentClass: 'bg-secondary text-foreground',
    },
    {
      id: 'labs',
      title: 'Laboratório Finango',
      description: 'Recursos experimentais em teste.',
      icon: <FlaskConical size={26} />,
      onClick: () => navigate('/settings/labs'),
      accentClass: 'bg-primary/15 text-primary',
    },
    {
      id: 'help',
      title: 'Ajuda e Suporte',
      description: 'Central de ajuda, contato e feedback.',
      icon: <HelpCircle size={26} />,
      onClick: () => navigate('/settings/help'),
      accentClass: 'bg-secondary text-foreground',
    },
    {
      id: 'about',
      title: 'Sobre',
      description: 'Versão, changelog, políticas e licenças.',
      icon: <Info size={26} />,
      onClick: () => navigate('/settings/about'),
      accentClass: 'bg-secondary text-foreground',
    },
  ];

  return (
    <div className="min-h-screen bg-background pb-24 safe-top">
      <header className="px-4 pt-6 pb-4 max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold">Configurações</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Central de configuração completa do seu Finango.
        </p>
      </header>

      <main className="px-4 space-y-5 max-w-4xl mx-auto">
        <section className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {categories.map(c => (
            <SettingsCategoryCard
              key={c.id}
              icon={c.icon}
              title={c.title}
              description={c.description}
              accentClass={c.accentClass}
              onClick={c.onClick}
            />
          ))}
        </section>

        {/* Família */}
        {isAuthenticated && (
          <PlanGate feature="family" inline>
            <section className="card-finance">
              <button
                onClick={() => setShowFamily(v => !v)}
                className="w-full flex items-center gap-3 touch-scale"
              >
                <div className="w-12 h-12 rounded-2xl bg-primary/15 text-primary flex items-center justify-center">
                  <Users size={22} />
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <p className="font-semibold">Família</p>
                  <p className="text-xs text-muted-foreground">Compartilhe finanças com sua família</p>
                </div>
                <ChevronRight
                  size={20}
                  className={`text-muted-foreground transition-transform ${showFamily ? 'rotate-90' : ''}`}
                />
              </button>
              {showFamily && (
                <div className="mt-4 pt-4 border-t border-border animate-fade-in">
                  <FamilySettings />
                </div>
              )}
            </section>
          </PlanGate>
        )}

        {/* Admin */}
        {isAuthenticated && isAdmin && (
          <SettingsCategoryCard
            icon={<ShieldCheck size={26} />}
            title="Painel Administrativo"
            description="Ferramentas de admin do Finango."
            accentClass="bg-primary/15 text-primary"
            onClick={() => navigate('/admin')}
            badge="Admin"
          />
        )}

        {/* Zona de perigo */}
        {isAuthenticated && (
          <section className="card-finance border border-destructive/20">
            <h2 className="font-semibold mb-3 flex items-center gap-2 text-destructive">
              <Trash2 size={18} /> Zona de perigo
            </h2>
            {showConfirmClear ? (
              <div className="space-y-3">
                <p className="text-sm text-destructive">
                  ⚠️ Isso apagará todas as suas transações e metas. Esta ação não pode ser desfeita.
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
              <button
                onClick={() => setShowConfirmClear(true)}
                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-destructive/10 touch-scale text-destructive text-left"
              >
                <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center">
                  <Trash2 size={18} />
                </div>
                <div className="flex-1">
                  <p className="font-medium">Limpar todos os dados</p>
                  <p className="text-xs text-destructive/70">Ação irreversível</p>
                </div>
              </button>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
