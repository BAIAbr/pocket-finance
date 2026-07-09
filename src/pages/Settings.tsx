import { useState } from 'react';
import { useFinanceContext } from '@/contexts/FinanceContext';
import { useTheme, COLOR_SCHEMES } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useAdminCheck } from '@/hooks/useAdminCheck';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useNavigate } from 'react-router-dom';
import {
  Moon, Sun, Trash2, Info, User, Cloud, Download, Mail,
  ShieldCheck, Bell, BellOff, Palette, Check, CalendarClock, CreditCard,
  Shield, Crown, Sparkles, ChevronRight, Instagram,
} from 'lucide-react';
import { FamilySettings } from '@/components/FamilySettings';
import { VipRedeemInput } from '@/components/VipRedeemInput';
import { PlanGate } from '@/components/PlanGate';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import finangoLogo from '@/assets/finango-logo.png.asset.json';

const INSTAGRAM_URL = 'https://instagram.com/finango.finance';
const INSTAGRAM_HANDLE = '@finango.finance';
const SUPPORT_EMAIL = 'suporte@finango.online';

interface RowProps {
  icon: React.ReactNode;
  label: string;
  description?: string;
  onClick?: () => void;
  danger?: boolean;
  highlight?: boolean;
  trailing?: React.ReactNode;
}
function Row({ icon, label, description, onClick, danger, highlight, trailing }: RowProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-3 p-3 rounded-xl transition-all touch-scale text-left',
        highlight ? 'bg-primary/10 hover:bg-primary/15' : 'hover:bg-secondary/60',
        danger && 'text-destructive hover:bg-destructive/10'
      )}
    >
      <div className={cn(
        'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
        danger ? 'bg-destructive/10 text-destructive' : highlight ? 'bg-primary/15 text-primary' : 'bg-secondary text-foreground'
      )}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{label}</p>
        {description && <p className="text-xs text-muted-foreground truncate">{description}</p>}
      </div>
      {trailing ?? <ChevronRight size={18} className="text-muted-foreground shrink-0" />}
    </button>
  );
}

export default function SettingsPage() {
  const { clearAllData } = useFinanceContext();
  const { theme, toggleTheme, colorScheme, setColorScheme } = useTheme();
  const { isAuthenticated, user } = useAuth();
  const { isAdmin } = useAdminCheck(user?.id);
  const { isSupported: pushSupported, isSubscribed: pushSubscribed, isLoading: pushLoading, subscribe: pushSubscribe, unsubscribe: pushUnsubscribe } = usePushNotifications(user?.id);
  const navigate = useNavigate();
  const [showConfirmClear, setShowConfirmClear] = useState(false);



  const handleAvatarClick = () => fileInputRef.current?.click();

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;
    if (!/^image\/(png|jpe?g|webp)$/i.test(file.type)) {
      toast.error('Formato inválido. Use PNG, JPG ou WEBP.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('A imagem deve ter no máximo 5MB');
      return;
    }
    setIsUploadingAvatar(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/avatar-${Date.now()}.${fileExt}`;
      try {
        const { data: files } = await supabase.storage.from('avatars').list(user.id);
        if (files && files.length > 0) {
          await supabase.storage.from('avatars').remove(files.map((f) => `${user.id}/${f.name}`));
        }
      } catch {}
      const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(fileName);
      await updateProfile({ avatar_url: `${publicUrl}?t=${Date.now()}` });
      toast.success('Foto de perfil atualizada!');
    } catch (error) {
      console.error(error);
      toast.error('Erro ao enviar foto');
    } finally {
      setIsUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveAvatar = async () => {
    if (!user) return;
    setIsRemovingAvatar(true);
    try {
      try {
        const { data: files } = await supabase.storage.from('avatars').list(user.id);
        if (files && files.length > 0) {
          await supabase.storage.from('avatars').remove(files.map((f) => `${user.id}/${f.name}`));
        }
      } catch {}
      await updateProfile({ avatar_url: null });
      toast.success('Foto removida');
    } catch (e) {
      console.error(e);
      toast.error('Erro ao remover foto');
    } finally {
      setIsRemovingAvatar(false);
    }
  };

  const handleInstallApp = () => {
    const deferredPrompt = (window as any).deferredPrompt;
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then((choiceResult: any) => {
        if (choiceResult.outcome === 'accepted') toast.success('App instalado com sucesso!');
        (window as any).deferredPrompt = null;
      });
    } else {
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const isAndroid = /Android/.test(navigator.userAgent);
      if (isIOS) toast.info('Toque em compartilhar e "Adicionar à Tela de Início"', { duration: 5000 });
      else if (isAndroid) toast.info('Menu do navegador → "Instalar aplicativo"', { duration: 5000 });
      else toast.info('Clique no ícone de instalação na barra de endereço', { duration: 5000 });
    }
  };

  const displayName = profile?.name || authProfile?.email?.split('@')[0] || 'Usuário';
  const displayEmail = profile?.email || authProfile?.email || '';
  const avatarUrl = profile?.avatar_url || null;
  const badge = planBadgeMeta(planCode || 'free');
  const currentPlan = plans.find((p) => p.code === planCode);
  const isPremium = badge.label !== 'FREE';

  return (
    <div className="min-h-screen bg-background pb-24 safe-top">
      <header className="px-4 pt-6 pb-4 max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold">Configurações</h1>
      </header>

      <main className="px-4 space-y-5 max-w-3xl mx-auto">
        {/* ===================== VIP redeem ===================== */}
        {isAuthenticated && <VipRedeemInput />}


        {/* ===================== INSTALL APP ===================== */}
        <section className="card-finance gradient-balance text-primary-foreground">
          <button onClick={handleInstallApp} className="w-full flex items-center justify-between touch-scale">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-primary-foreground/20 flex items-center justify-center">
                <Download size={24} />
              </div>
              <div className="text-left">
                <p className="font-semibold text-lg">Baixar Aplicativo</p>
                <p className="text-sm text-primary-foreground/80">Instale no seu celular</p>
              </div>
            </div>
            <ChevronRight size={20} />
          </button>
        </section>

        {/* ===================== PREFERÊNCIAS ===================== */}
        <section className="card-finance">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <Sparkles size={18} /> Preferências
          </h2>

          {/* Theme toggle */}
          <button onClick={toggleTheme} className="w-full flex items-center justify-between py-2 mb-2 touch-scale">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
                {theme === 'dark' ? <Moon size={18} /> : <Sun size={18} />}
              </div>
              <div className="text-left">
                <p className="font-medium">Tema {theme === 'dark' ? 'Escuro' : 'Claro'}</p>
                <p className="text-xs text-muted-foreground">Toque para alternar</p>
              </div>
            </div>
            <div className={cn(
              'w-12 h-7 rounded-full flex items-center px-1 transition-all',
              theme === 'dark' ? 'bg-primary justify-end' : 'bg-secondary justify-start'
            )}>
              <div className="w-5 h-5 rounded-full bg-background shadow-md" />
            </div>
          </button>

          {/* Color schemes */}
          <div className="mt-4 pt-4 border-t border-border">
            <div className="flex items-center gap-2 mb-3">
              <Palette size={16} className="text-muted-foreground" />
              <p className="font-medium text-sm">Tema de cores</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {COLOR_SCHEMES.map((scheme) => (
                <button
                  key={scheme.id}
                  onClick={() => setColorScheme(scheme.id)}
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-xl transition-all touch-scale text-left',
                    colorScheme === scheme.id ? 'bg-primary/15 ring-2 ring-primary' : 'bg-secondary/50 hover:bg-secondary'
                  )}
                >
                  {scheme.id === 'default'
                    ? <img src={finangoLogo.url} alt="Finango" className="w-6 h-6 object-contain" />
                    : <span className="text-xl">{scheme.emoji}</span>}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{scheme.name}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{scheme.description}</p>
                  </div>
                  {colorScheme === scheme.id && <Check size={16} className="text-primary shrink-0" />}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* ===================== NOTIFICAÇÕES ===================== */}
        {isAuthenticated && pushSupported && (
          <section className="card-finance">
            <h2 className="font-semibold mb-3 flex items-center gap-2">
              <Bell size={18} /> Notificações
            </h2>
            <div className="flex items-center justify-between p-3 rounded-xl bg-secondary/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/15 text-primary flex items-center justify-center">
                  {pushSubscribed ? <Bell size={18} /> : <BellOff size={18} />}
                </div>
                <div>
                  <p className="font-medium text-sm">Notificações push</p>
                  <p className="text-xs text-muted-foreground">
                    {pushSubscribed ? 'Ativadas neste dispositivo' : 'Receba lembretes e resumos'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => (pushSubscribed ? pushUnsubscribe() : pushSubscribe())}
                disabled={pushLoading}
                className={cn(
                  'px-3 py-2 rounded-xl text-sm font-semibold touch-scale',
                  pushSubscribed ? 'bg-secondary hover:bg-secondary/70' : 'bg-primary text-primary-foreground hover:bg-primary/90'
                )}
              >
                {pushLoading ? '...' : pushSubscribed ? 'Desativar' : 'Ativar'}
              </button>
            </div>
          </section>
        )}

        {/* ===================== ASSINATURAS & COMPRAS ===================== */}
        {isAuthenticated && (
          <section className="card-finance">
            <h2 className="font-semibold mb-3 flex items-center gap-2">
              <CreditCard size={18} /> Assinaturas & Compras
            </h2>
            <div className="space-y-1.5">
              <Row icon={<Crown size={18} />} label="Planos & Assinatura" description="Ver benefícios e fazer upgrade" onClick={() => navigate('/plans')} highlight />
              <Row icon={<CalendarClock size={18} />} label="Assinaturas & Contas" description="Recorrentes mensais" onClick={() => navigate('/recurring')} />
              <Row icon={<CreditCard size={18} />} label="Compras Parceladas" description="Gerenciar parcelamentos" onClick={() => navigate('/installments')} />
            </div>
          </section>
        )}

        {/* ===================== FAMILY ===================== */}
        {isAuthenticated && (
          <PlanGate feature="family" inline>
            <FamilySettings />
          </PlanGate>
        )}

        {/* ===================== SEGURANÇA & 2FA ===================== */}
        {isAuthenticated && (
          <section className="card-finance">
            <h2 className="font-semibold mb-3 flex items-center gap-2">
              <Shield size={18} /> Segurança & 2FA
            </h2>
            <Row
              icon={<Shield size={18} />}
              label="Segurança da conta"
              description="Senha, 2FA, sessões e dispositivos"
              onClick={() => navigate('/security')}
              highlight
            />
          </section>
        )}

        {/* ===================== CONTATO ===================== */}
        <section className="card-finance">
          <h2 className="font-semibold mb-3 flex items-center gap-2">
            <Mail size={18} /> Contato
          </h2>
          <div className="space-y-2">
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="w-full flex items-center gap-3 p-3 rounded-xl bg-secondary/50 hover:bg-secondary transition-all touch-scale"
            >
              <div className="w-10 h-10 rounded-xl bg-primary/15 text-primary flex items-center justify-center">
                <Mail size={18} />
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="font-medium">E-mail de Suporte</p>
                <p className="text-xs text-muted-foreground truncate">{SUPPORT_EMAIL}</p>
              </div>
              <ChevronRight size={18} className="text-muted-foreground" />
            </a>

            <a
              href={INSTAGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center gap-3 p-3 rounded-xl bg-secondary/50 hover:bg-secondary transition-all touch-scale"
            >
              <div className="w-10 h-10 rounded-xl bg-primary/15 text-primary flex items-center justify-center">
                <Instagram size={18} />
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="font-medium">Instagram Oficial</p>
                <p className="text-xs text-muted-foreground truncate">{INSTAGRAM_HANDLE}</p>
              </div>
              <ChevronRight size={18} className="text-muted-foreground" />
            </a>
          </div>
        </section>

        {/* ===================== ADMIN ===================== */}
        {isAuthenticated && isAdmin && (
          <section className="card-finance">
            <Row
              icon={<ShieldCheck size={18} />}
              label="Painel Administrativo"
              description="Ferramentas de admin"
              onClick={() => navigate('/admin')}
              highlight
            />
          </section>
        )}

        {/* ===================== DADOS ===================== */}
        {isAuthenticated && (
          <section className="card-finance">
            <h2 className="font-semibold mb-3 flex items-center gap-2">
              <Trash2 size={18} /> Dados
            </h2>
            {showConfirmClear ? (
              <div className="space-y-3">
                <p className="text-sm text-destructive">
                  ⚠️ Isso apagará todas as suas transações e metas. Esta ação não pode ser desfeita.
                </p>
                <div className="flex gap-2">
                  <button onClick={() => setShowConfirmClear(false)} className="flex-1 py-3 rounded-xl bg-secondary font-medium touch-scale">
                    Cancelar
                  </button>
                  <button
                    onClick={async () => { await clearAllData(); setShowConfirmClear(false); }}
                    className="flex-1 py-3 rounded-xl bg-destructive text-destructive-foreground font-medium touch-scale"
                  >
                    Confirmar
                  </button>
                </div>
              </div>
            ) : (
              <Row icon={<Trash2 size={18} />} label="Limpar todos os dados" danger onClick={() => setShowConfirmClear(true)} />
            )}
          </section>
        )}

        {/* ===================== SOBRE ===================== */}
        <section className="card-finance">
          <h2 className="font-semibold mb-3 flex items-center gap-2">
            <Info size={18} /> Sobre
          </h2>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between py-1.5">
              <span className="text-muted-foreground">Versão</span>
              <span className="font-mono">2.2.0</span>
            </div>
            <div className="flex items-center justify-between py-1.5">
              <span className="text-muted-foreground">Armazenamento</span>
              <span className="font-mono flex items-center gap-1"><Cloud size={14} className="text-primary" /> Nuvem</span>
            </div>
          </div>
        </section>

      </main>
    </div>
  );
}
