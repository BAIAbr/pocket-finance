import { useState, useRef } from 'react';
import { useFinanceContext } from '@/contexts/FinanceContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Moon, Sun, DollarSign, Trash2, Info, LogOut, User, Cloud, Camera, Download, Mail } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

export default function SettingsPage() {
  const { settings, setSettings, clearAllData, profile, updateProfile } = useFinanceContext();
  const { theme, toggleTheme } = useTheme();
  const { isAuthenticated, signOut, profile: authProfile, user } = useAuth();
  const navigate = useNavigate();
  const [showConfirmClear, setShowConfirmClear] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currencies = [
    { code: 'BRL', symbol: 'R$', name: 'Real Brasileiro' },
    { code: 'USD', symbol: '$', name: 'Dólar Americano' },
    { code: 'EUR', symbol: '€', name: 'Euro' },
  ];

  const handleClearData = async () => {
    await clearAllData();
    setShowConfirmClear(false);
  };

  const handleLogout = async () => {
    await signOut();
    toast.success('Até logo!');
    navigate('/auth');
  };

  const handleCurrencyChange = async (currencyCode: string, currencySymbol: string) => {
    if (isAuthenticated && profile) {
      await updateProfile({ currency: currencyCode });
    }
    setSettings({ ...settings, currency: currencyCode, currencySymbol });
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Por favor, selecione uma imagem');
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('A imagem deve ter no máximo 2MB');
      return;
    }

    setIsUploadingAvatar(true);

    try {
      // Create unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/avatar.${fileExt}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true });

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      // Update profile with new avatar URL
      await updateProfile({ avatar_url: publicUrl });
      toast.success('Foto de perfil atualizada!');
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast.error('Erro ao enviar foto');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleInstallApp = () => {
    // Check if app is installable (PWA)
    const deferredPrompt = (window as any).deferredPrompt;
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then((choiceResult: any) => {
        if (choiceResult.outcome === 'accepted') {
          toast.success('App instalado com sucesso!');
        }
        (window as any).deferredPrompt = null;
      });
    } else {
      // Show instructions based on platform
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const isAndroid = /Android/.test(navigator.userAgent);
      
      if (isIOS) {
        toast.info('Para instalar: toque no ícone de compartilhar e selecione "Adicionar à Tela de Início"', {
          duration: 5000,
        });
      } else if (isAndroid) {
        toast.info('Para instalar: toque no menu do navegador e selecione "Instalar aplicativo"', {
          duration: 5000,
        });
      } else {
        toast.info('Para instalar: clique no ícone de instalação na barra de endereço do navegador', {
          duration: 5000,
        });
      }
    }
  };

  const displayName = profile?.name || authProfile?.email?.split('@')[0] || 'Usuário';
  const displayEmail = profile?.email || authProfile?.email || '';
  const avatarUrl = profile?.avatar_url || null;

  return (
    <div className="min-h-screen bg-background pb-24 safe-top">
      {/* Header */}
      <header className="px-4 pt-6 pb-4">
        <h1 className="text-2xl font-bold">Configurações</h1>
      </header>

      <main className="px-4 space-y-6">
        {/* Download App Button - Highly Visible */}
        <section className="card-finance gradient-balance text-white">
          <button
            onClick={handleInstallApp}
            className="w-full flex items-center justify-between touch-scale"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
                <Download size={24} />
              </div>
              <div className="text-left">
                <p className="font-semibold text-lg">Baixar Aplicativo</p>
                <p className="text-sm text-white/80">Instale no seu celular</p>
              </div>
            </div>
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
              <Download size={20} />
            </div>
          </button>
        </section>

        {/* User Section */}
        <section className="card-finance">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <User size={18} />
            Conta
          </h2>
          {isAuthenticated ? (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Avatar className="w-16 h-16 cursor-pointer touch-scale" onClick={handleAvatarClick}>
                    {avatarUrl ? (
                      <AvatarImage src={avatarUrl} alt={displayName} />
                    ) : null}
                    <AvatarFallback className="gradient-balance text-white font-bold text-xl">
                      {displayName.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <button
                    onClick={handleAvatarClick}
                    disabled={isUploadingAvatar}
                    className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-accent flex items-center justify-center text-accent-foreground shadow-md touch-scale"
                  >
                    {isUploadingAvatar ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Camera size={14} />
                    )}
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    className="hidden"
                  />
                </div>
                <div>
                  <p className="font-semibold">{displayName}</p>
                  <p className="text-sm text-muted-foreground">{displayEmail}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground bg-secondary/50 p-3 rounded-xl">
                <Cloud size={14} className="text-primary" />
                <span>Dados sincronizados na nuvem</span>
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-secondary/50 hover:bg-secondary transition-all touch-scale text-destructive"
              >
                <span>Sair da conta</span>
                <LogOut size={18} />
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Crie uma conta para sincronizar seus dados na nuvem.
              </p>
              <button
                onClick={() => navigate('/auth')}
                className="w-full py-3 rounded-xl gradient-balance text-white font-medium touch-scale"
              >
                Entrar ou criar conta
              </button>
            </div>
          )}
        </section>

        {/* Appearance */}
        <section className="card-finance">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            {theme === 'dark' ? <Moon size={18} /> : <Sun size={18} />}
            Aparência
          </h2>
          <button
            onClick={toggleTheme}
            className="w-full flex items-center justify-between py-3"
          >
            <div>
              <p className="font-medium">Tema {theme === 'dark' ? 'Escuro' : 'Claro'}</p>
              <p className="text-sm text-muted-foreground">
                Toque para alternar
              </p>
            </div>
            <div 
              className={cn(
                'w-14 h-8 rounded-full flex items-center px-1 transition-all duration-300',
                theme === 'dark' ? 'bg-accent justify-end' : 'bg-secondary justify-start'
              )}
            >
              <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center shadow-md transition-all duration-300">
                {theme === 'dark' ? (
                  <Moon size={14} className="text-accent" />
                ) : (
                  <Sun size={14} className="text-warning" />
                )}
              </div>
            </div>
          </button>
        </section>

        {/* Currency */}
        <section className="card-finance">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <DollarSign size={18} />
            Moeda
          </h2>
          <div className="space-y-2">
            {currencies.map(currency => (
              <button
                key={currency.code}
                onClick={() => handleCurrencyChange(currency.code, currency.symbol)}
                className={cn(
                  'w-full flex items-center justify-between p-3 rounded-xl transition-all touch-scale',
                  settings.currency === currency.code 
                    ? 'bg-accent/20 ring-1 ring-accent' 
                    : 'bg-secondary/50 hover:bg-secondary'
                )}
              >
                <div className="flex items-center gap-3">
                  <span className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center font-mono font-bold">
                    {currency.symbol}
                  </span>
                  <div className="text-left">
                    <p className="font-medium">{currency.name}</p>
                    <p className="text-xs text-muted-foreground">{currency.code}</p>
                  </div>
                </div>
                {settings.currency === currency.code && (
                  <div className="w-5 h-5 rounded-full bg-accent flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-white" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </section>

        {/* Data */}
        {isAuthenticated && (
          <section className="card-finance">
            <h2 className="font-semibold mb-4 flex items-center gap-2">
              <Trash2 size={18} />
              Dados
            </h2>
            {showConfirmClear ? (
              <div className="space-y-3">
                <p className="text-sm text-destructive">
                  ⚠️ Isso apagará todas as suas transações e metas de poupança. Esta ação não pode ser desfeita.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowConfirmClear(false)}
                    className="flex-1 py-3 rounded-xl bg-secondary font-medium touch-scale"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleClearData}
                    className="flex-1 py-3 rounded-xl bg-destructive text-destructive-foreground font-medium touch-scale"
                  >
                    Confirmar
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowConfirmClear(true)}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-secondary/50 hover:bg-secondary transition-all touch-scale text-destructive"
              >
                <span>Limpar todos os dados</span>
                <Trash2 size={18} />
              </button>
            )}
          </section>
        )}

        {/* About */}
        <section className="card-finance">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <Info size={18} />
            Sobre
          </h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2">
              <span className="text-muted-foreground">Versão</span>
              <span className="font-mono">2.0.0</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-muted-foreground">Armazenamento</span>
              <span className="font-mono flex items-center gap-1">
                <Cloud size={14} className="text-primary" />
                Nuvem
              </span>
            </div>
          </div>
        </section>

        {/* Contact */}
        <section className="card-finance">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <Mail size={18} />
            Contato
          </h2>
          <a
            href="mailto:finangobr@gmail.com"
            className="w-full flex items-center justify-between p-3 rounded-xl bg-secondary/50 hover:bg-secondary transition-all touch-scale"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full gradient-balance flex items-center justify-center">
                <Mail size={18} className="text-white" />
              </div>
              <div className="text-left">
                <p className="font-medium">Email de Suporte</p>
                <p className="text-sm text-muted-foreground">finangobr@gmail.com</p>
              </div>
            </div>
          </a>
        </section>

        {/* Footer */}
        <div className="text-center text-xs text-muted-foreground p-4">
          <p>FINANGO © 2025</p>
          <p className="mt-1">Seus dados são sincronizados de forma segura</p>
        </div>
      </main>
    </div>
  );
}
