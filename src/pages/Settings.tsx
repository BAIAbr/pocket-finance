import { useState, useRef } from 'react';
import { useFinanceContext } from '@/contexts/FinanceContext';
import { useTheme, COLOR_SCHEMES } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useAdminCheck } from '@/hooks/useAdminCheck';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { usePlanAccess } from '@/hooks/usePlanAccess';
import { useSubscription } from '@/hooks/useSubscription';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Moon, Sun, Trash2, Info, LogOut, User, Cloud, Camera, Download, Mail,
  ShieldCheck, Bell, BellOff, Palette, Check, CalendarClock, CreditCard,
  Shield, Crown, Sparkles, ChevronRight, Instagram, HelpCircle, X, Star,
} from 'lucide-react';
import { FamilySettings } from '@/components/FamilySettings';
import { VipRedeemInput } from '@/components/VipRedeemInput';
import { PlanGate } from '@/components/PlanGate';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import finangoLogo from '@/assets/finango-logo.png.asset.json';
import foxMask from '@/assets/finango-fox-mask.png.asset.json';

const INSTAGRAM_URL = 'https://instagram.com/finango.finance';
const INSTAGRAM_HANDLE = '@finango.finance';
const SUPPORT_EMAIL = 'suporte@finango.online';

function planBadgeMeta(code: string) {
  const c = (code || 'free').toLowerCase();
  if (c.includes('vip')) return { label: 'VIP', icon: '👑', className: 'bg-gradient-to-r from-amber-500 to-yellow-400 text-black' };
  if (c.includes('premium') || c.includes('pro') || c.includes('plus')) return { label: 'PREMIUM', icon: '💎', className: 'bg-gradient-to-r from-primary to-orange-400 text-primary-foreground' };
  if (c.includes('family') || c.includes('familia')) return { label: 'FAMÍLIA', icon: '👨‍👩‍👧', className: 'bg-gradient-to-r from-primary to-orange-400 text-primary-foreground' };
  return { label: 'FREE', icon: '🟢', className: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500/30' };
}

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
  const { settings, setSettings, clearAllData, profile, updateProfile } = useFinanceContext();
  const { theme, toggleTheme, colorScheme, setColorScheme } = useTheme();
  const { isAuthenticated, signOut, profile: authProfile, user } = useAuth();
  const { isAdmin } = useAdminCheck(user?.id);
  const { planCode } = usePlanAccess();
  const { plans } = useSubscription(user?.id);
  const { isSupported: pushSupported, isSubscribed: pushSubscribed, isLoading: pushLoading, subscribe: pushSubscribe, unsubscribe: pushUnsubscribe } = usePushNotifications(user?.id);
  const navigate = useNavigate();
  const [showConfirmClear, setShowConfirmClear] = useState(false);
  const [showConfirmLogout, setShowConfirmLogout] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isRemovingAvatar, setIsRemovingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleLogout = async () => {
    await signOut();
    toast.success('Até logo!');
    navigate('/auth');
  };

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
        {/* ===================== PREMIUM PROFILE HEADER ===================== */}
        {isAuthenticated ? (
          <section
            className="relative overflow-hidden rounded-3xl p-6 shadow-lg text-primary-foreground"
            style={{
              backgroundImage:
                'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary-glow)) 55%, hsl(var(--balance-end)) 100%)',
            }}
          >
            {/* Glow accents */}
            <div className="absolute -top-16 -left-10 w-52 h-52 rounded-full bg-white/15 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-20 right-1/3 w-48 h-48 rounded-full bg-black/10 blur-3xl pointer-events-none" />

            {/* VIP subtle sheen animation */}
            {badge.label === 'VIP' && (
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div
                  className="absolute top-0 -left-full w-full h-full bg-gradient-to-r from-transparent via-white/15 to-transparent animate-vip-sheen"
                  style={{ animationDuration: '4s' }}
                />
              </div>
            )}

            {/* Fox watermark — changes color with theme (uses primary token via mask) */}
            <div
              aria-hidden
              className="absolute -right-6 bottom-0 sm:right-4 sm:bottom-6 w-40 h-40 sm:w-48 sm:h-48 pointer-events-none opacity-90"
              style={{
                backgroundColor: 'hsl(var(--primary-foreground))',
                WebkitMaskImage: `url(${foxMask.url})`,
                maskImage: `url(${foxMask.url})`,
                WebkitMaskRepeat: 'no-repeat',
                maskRepeat: 'no-repeat',
                WebkitMaskPosition: 'center',
                maskPosition: 'center',
                WebkitMaskSize: 'contain',
                maskSize: 'contain',
                filter: 'drop-shadow(0 4px 12px hsl(0 0% 0% / 0.25))',
                mixBlendMode: 'soft-light',
              }}
            />
            {/* Second, tinted fox layer for stronger theme accent */}
            <div
              aria-hidden
              className="absolute -right-6 bottom-0 sm:right-4 sm:bottom-6 w-40 h-40 sm:w-48 sm:h-48 pointer-events-none opacity-40"
              style={{
                backgroundColor: 'hsl(var(--primary))',
                WebkitMaskImage: `url(${foxMask.url})`,
                maskImage: `url(${foxMask.url})`,
                WebkitMaskRepeat: 'no-repeat',
                maskRepeat: 'no-repeat',
                WebkitMaskPosition: 'center',
                maskPosition: 'center',
                WebkitMaskSize: 'contain',
                maskSize: 'contain',
              }}
            />

            <div className="relative flex flex-col sm:flex-row items-center sm:items-start gap-5 sm:pr-32">
              {/* Avatar */}
              <div className="relative">
                <Avatar className="w-24 h-24 ring-4 ring-white/40 cursor-pointer touch-scale" onClick={handleAvatarClick}>
                  {avatarUrl ? <AvatarImage src={avatarUrl} alt={displayName} /> : null}
                  <AvatarFallback className="bg-gradient-to-br from-primary to-orange-500 text-primary-foreground font-bold text-2xl">
                    {displayName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <button
                  onClick={handleAvatarClick}
                  disabled={isUploadingAvatar}
                  aria-label="Alterar foto"
                  className="absolute -bottom-1 -right-1 w-9 h-9 rounded-full bg-background text-foreground shadow-lg ring-2 ring-primary/40 flex items-center justify-center touch-scale"
                >
                  {isUploadingAvatar
                    ? <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    : <Camera size={16} />}
                </button>
                <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={handleAvatarUpload} className="hidden" />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0 text-center sm:text-left">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-1">
                  <h2 className="text-xl font-bold truncate drop-shadow-sm">{displayName}</h2>
                  <button
                    onClick={() => navigate('/plans')}
                    className={cn(
                      'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold tracking-wide touch-scale shadow-md',
                      badge.className
                    )}
                  >
                    <span>{badge.icon}</span>
                    <span>{badge.label}</span>
                  </button>
                </div>
                <p className="text-sm truncate text-primary-foreground/85">{displayEmail}</p>
                <p className="text-xs mt-1 truncate text-primary-foreground/75">
                  {currentPlan ? `Plano ${currentPlan.name}` : badge.label === 'FREE' ? 'Plano Gratuito' : `Plano ${badge.label}`}
                </p>

                <div className="flex flex-wrap gap-2 mt-4 justify-center sm:justify-start">
                  <button
                    onClick={() => navigate('/plans')}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold touch-scale bg-white text-primary hover:bg-white/90 shadow-md"
                  >
                    <Crown size={16} /> Gerenciar Plano
                  </button>
                  {avatarUrl && (
                    <button
                      onClick={handleRemoveAvatar}
                      disabled={isRemovingAvatar}
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium touch-scale bg-white/15 text-primary-foreground hover:bg-white/25 backdrop-blur"
                    >
                      <X size={14} /> Remover foto
                    </button>
                  )}
                </div>
              </div>
            </div>
          </section>
        ) : (
          <section className="card-finance">
            <h2 className="font-semibold mb-4 flex items-center gap-2"><User size={18} /> Conta</h2>
            <p className="text-sm text-muted-foreground mb-3">Crie uma conta para sincronizar seus dados na nuvem.</p>
            <button
              onClick={() => navigate('/auth')}
              className="w-full py-3 rounded-xl gradient-balance text-primary-foreground font-medium touch-scale"
            >
              Entrar ou criar conta
            </button>
          </section>
        )}

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

        {/* ===================== SAIR ===================== */}
        {isAuthenticated && (
          <section className="card-finance">
            {showConfirmLogout ? (
              <div className="space-y-3">
                <div className="text-center">
                  <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-destructive/10 flex items-center justify-center">
                    <LogOut size={22} className="text-destructive" />
                  </div>
                  <p className="font-semibold">Tem certeza que deseja sair?</p>
                  <p className="text-xs text-muted-foreground">Você precisará entrar novamente para acessar sua conta.</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setShowConfirmLogout(false)} className="flex-1 py-3 rounded-xl bg-secondary font-medium touch-scale">
                    Cancelar
                  </button>
                  <button onClick={handleLogout} className="flex-1 py-3 rounded-xl bg-destructive text-destructive-foreground font-medium touch-scale">
                    Sair
                  </button>
                </div>
              </div>
            ) : (
              <Row icon={<LogOut size={18} />} label="Sair da conta" danger onClick={() => setShowConfirmLogout(true)} trailing={<LogOut size={18} className="text-destructive" />} />
            )}
          </section>
        )}
      </main>
    </div>
  );
}
