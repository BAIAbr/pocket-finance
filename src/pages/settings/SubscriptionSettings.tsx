import { useState } from 'react';
import { CreditCard, Crown, Check, Link2, Building2, FileUp, Plus, Chrome, Apple } from 'lucide-react';
import { SettingsSubPageHeader } from '@/components/settings/SettingsSubPageHeader';
import { SettingRow } from '@/components/settings/SettingRow';
import { VipRedeemInput } from '@/components/VipRedeemInput';
import { useSubscription } from '@/hooks/useSubscription';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function SubscriptionSettings() {
  const [tab, setTab] = useState<'plan' | 'accounts'>('plan');
  const { user } = useAuth();
  const { plans, currentPlanCode } = useSubscription(user?.id);
  const navigate = useNavigate();
  const currentPlan = plans.find(p => p.code === currentPlanCode);

  const soon = () => toast.info('Em breve');

  return (
    <div className="min-h-screen bg-background pb-24">
      <SettingsSubPageHeader title="Assinatura e Contas" description="Gerencie seu plano e conexões." icon={<CreditCard size={22} />} />

      <main className="px-4 space-y-5 max-w-3xl mx-auto">
        <div className="flex items-center gap-2 p-1 rounded-xl bg-secondary/50">
          {[
            { id: 'plan', label: 'Plano Finango' },
            { id: 'accounts', label: 'Contas Conectadas' },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id as typeof tab)}
              className={cn(
                'flex-1 py-2 rounded-lg text-sm font-medium touch-scale transition-all',
                tab === t.id ? 'bg-background shadow-sm' : 'text-muted-foreground',
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'plan' && (
          <>
            <section className="card-finance gradient-balance text-primary-foreground">
              <div className="flex items-center gap-3 mb-2">
                <Crown size={24} />
                <div>
                  <p className="text-xs opacity-80">Plano atual</p>
                  <p className="text-xl font-bold">{currentPlan?.name ?? 'Free'}</p>
                </div>
              </div>
              <p className="text-sm opacity-90">{currentPlan?.description ?? 'Comece grátis e evolua quando quiser.'}</p>
              <button
                onClick={() => navigate('/plans')}
                className="mt-4 w-full py-2.5 rounded-xl bg-primary-foreground/20 hover:bg-primary-foreground/25 font-semibold touch-scale"
              >
                Ver planos e fazer upgrade
              </button>
            </section>

            {currentPlan && currentPlan.features.length > 0 && (
              <section className="card-finance">
                <h2 className="font-semibold mb-3">Benefícios</h2>
                <ul className="space-y-2">
                  {currentPlan.features.slice(0, 8).map((f, i) => (
                    <li key={i} className={cn('flex items-start gap-2 text-sm', !f.enabled && 'opacity-50')}>
                      <Check size={16} className="text-primary shrink-0 mt-0.5" />
                      <span>{f.label}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <section className="card-finance">
              <h2 className="font-semibold mb-3">Gerenciar assinatura</h2>
              <div className="space-y-1.5">
                <SettingRow icon={<CreditCard size={18} />} label="Método de pagamento" description="Em breve" onClick={soon} />
                <SettingRow icon={<Crown size={18} />} label="Histórico de cobrança" description="Em breve" onClick={soon} />
                <SettingRow icon={<Crown size={18} />} label="Renovação" description="Em breve" onClick={soon} />
                <SettingRow icon={<Crown size={18} />} label="Cancelar assinatura" description="Em breve" onClick={soon} danger />
              </div>
            </section>

            <VipRedeemInput />
          </>
        )}

        {tab === 'accounts' && (
          <section className="card-finance">
            <h2 className="font-semibold mb-3">Contas Conectadas</h2>
            <div className="space-y-1.5">
              <SettingRow icon={<Chrome size={18} />} label="Google" description="Vincular conta Google" onClick={soon} badge="Em breve" />
              <SettingRow icon={<Apple size={18} />} label="Apple" description="Vincular conta Apple" onClick={soon} badge="Em breve" />
              <SettingRow icon={<Link2 size={18} />} label="Open Finance" description="Sincronização automática" onClick={soon} badge="Em breve" />
              <SettingRow icon={<Building2 size={18} />} label="Bancos conectados" description="Gerenciar bancos vinculados" onClick={soon} badge="Em breve" />
              <SettingRow icon={<FileUp size={18} />} label="Importar OFX" description="Extratos bancários" onClick={soon} badge="Em breve" />
              <SettingRow icon={<FileUp size={18} />} label="Importar CSV" description="Planilhas personalizadas" onClick={soon} badge="Em breve" />
              <SettingRow icon={<Plus size={18} />} label="Adicionar nova conta" description="Conectar outra origem" onClick={soon} highlight />
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
