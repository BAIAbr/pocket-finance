import { useMemo } from 'react';
import { Palette, Moon, Sun, MonitorSmartphone, Check, LayoutDashboard, Sparkles, Zap, ZapOff, Gauge, Menu as MenuIcon, RotateCcw } from 'lucide-react';
import { SettingsSubPageHeader } from '@/components/settings/SettingsSubPageHeader';
import { useTheme, COLOR_SCHEMES } from '@/contexts/ThemeContext';
import { useUserPreferences } from '@/contexts/UserPreferencesContext';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import finangoLogo from '@/assets/finango-logo.png.asset.json';
import { toast } from 'sonner';

const DASHBOARD_CARDS: { id: string; label: string }[] = [
  { id: 'smartInsights', label: 'Assistente inteligente' },
  { id: 'balance', label: 'Saldo' },
  { id: 'chart', label: 'Gráfico' },
  { id: 'quickDeposit', label: 'Depósito rápido no cofrinho' },
  { id: 'monthlySummary', label: 'Resumo mensal' },
  { id: 'upcomingEvents', label: 'Próximos eventos' },
  { id: 'financialFeed', label: 'Feed financeiro' },
  { id: 'weeklySummary', label: 'Resumo semanal' },
  { id: 'yearOverYear', label: 'Comparativo Ano vs Ano' },
  { id: 'planning', label: 'Planejamento' },
  { id: 'investments', label: 'Investimentos' },
  { id: 'transactions', label: 'Transações recentes' },
];

const PRESETS: { id: 'essential' | 'investor' | 'planning' | 'business' | 'custom'; name: string; emoji: string; hidden: string[] }[] = [
  { id: 'essential', name: 'Essencial', emoji: '🏦', hidden: ['financialFeed', 'planning', 'investments', 'quickDeposit'] },
  { id: 'investor', name: 'Investidor', emoji: '📈', hidden: ['financialFeed', 'quickDeposit'] },
  { id: 'planning', name: 'Planejamento', emoji: '🎯', hidden: ['investments', 'financialFeed'] },
  { id: 'business', name: 'Empresarial', emoji: '💼', hidden: ['quickDeposit', 'weeklySummary', 'financialFeed'] },
  { id: 'custom', name: 'Personalizado', emoji: '✨', hidden: [] },
];

const MENU_ITEMS = [
  { id: 'home', label: 'Resumo' },
  { id: 'ai', label: 'IA' },
  { id: 'history', label: 'Histórico' },
  { id: 'savings', label: 'Cofrinho' },
  { id: 'settings', label: 'Ajustes' },
];

export default function AppearanceSettings() {
  const { theme, setTheme, colorScheme, setColorScheme } = useTheme();
  const {
    density, setDensity,
    animations, setAnimations,
    dashboardLayout, setDashboardLayout,
    menu, setMenu,
    themeMode, setThemeMode,
  } = useUserPreferences();

  const orderedCards = useMemo(() => {
    const known = dashboardLayout.order.filter(id => DASHBOARD_CARDS.some(c => c.id === id));
    const missing = DASHBOARD_CARDS.map(c => c.id).filter(id => !known.includes(id));
    return [...known, ...missing];
  }, [dashboardLayout.order]);

  const move = (id: string, dir: -1 | 1) => {
    const idx = orderedCards.indexOf(id);
    if (idx < 0) return;
    const target = idx + dir;
    if (target < 0 || target >= orderedCards.length) return;
    const next = [...orderedCards];
    [next[idx], next[target]] = [next[target], next[idx]];
    setDashboardLayout({ ...dashboardLayout, order: next, preset: 'custom' });
  };

  const toggleHidden = (id: string) => {
    const isHidden = dashboardLayout.hidden.includes(id);
    setDashboardLayout({
      ...dashboardLayout,
      hidden: isHidden ? dashboardLayout.hidden.filter(x => x !== id) : [...dashboardLayout.hidden, id],
      preset: 'custom',
    });
  };

  const applyPreset = (p: typeof PRESETS[number]) => {
    setDashboardLayout({ order: DASHBOARD_CARDS.map(c => c.id), hidden: p.hidden, preset: p.id });
    toast.success(`Layout "${p.name}" aplicado`);
  };

  const restoreLayout = () => {
    setDashboardLayout({ order: DASHBOARD_CARDS.map(c => c.id), hidden: [], preset: 'custom' });
    toast.success('Layout restaurado');
  };

  const toggleMenuHidden = (kind: 'bottom' | 'sidebar', id: string) => {
    const key = kind === 'bottom' ? 'bottomHidden' : 'sidebarHidden';
    const arr = menu[key];
    setMenu({
      ...menu,
      [key]: arr.includes(id) ? arr.filter(x => x !== id) : [...arr, id],
    });
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <SettingsSubPageHeader
        title="Personalização"
        description="Customize a aparência e a organização do Finango."
        icon={<Palette size={22} />}
      />

      <main className="px-4 space-y-5 max-w-3xl mx-auto">
        {/* Dashboard */}
        <section className="card-finance">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold flex items-center gap-2"><LayoutDashboard size={18} /> Dashboard</h2>
            <button onClick={restoreLayout} className="text-xs flex items-center gap-1 text-muted-foreground hover:text-foreground touch-scale">
              <RotateCcw size={12} /> Restaurar
            </button>
          </div>

          <p className="text-xs text-muted-foreground mb-3">Layouts prontos</p>
          <div className="grid grid-cols-2 gap-2 mb-4">
            {PRESETS.map(p => (
              <button
                key={p.id}
                onClick={() => applyPreset(p)}
                className={cn(
                  'flex items-center gap-2 p-2.5 rounded-xl text-left transition-all touch-scale',
                  dashboardLayout.preset === p.id ? 'bg-primary/15 ring-2 ring-primary' : 'bg-secondary/50 hover:bg-secondary',
                )}
              >
                <span className="text-xl">{p.emoji}</span>
                <span className="text-sm font-medium truncate">{p.name}</span>
                {dashboardLayout.preset === p.id && <Check size={14} className="ml-auto text-primary" />}
              </button>
            ))}
          </div>

          <p className="text-xs text-muted-foreground mb-2">Cards do Dashboard</p>
          <div className="space-y-1.5">
            {orderedCards.map((id, idx) => {
              const card = DASHBOARD_CARDS.find(c => c.id === id);
              if (!card) return null;
              const hidden = dashboardLayout.hidden.includes(id);
              return (
                <div key={id} className="flex items-center gap-2 p-2 rounded-xl bg-secondary/40">
                  <div className="flex flex-col">
                    <button
                      onClick={() => move(id, -1)}
                      disabled={idx === 0}
                      className="text-xs px-1 disabled:opacity-30 hover:text-primary"
                    >▲</button>
                    <button
                      onClick={() => move(id, 1)}
                      disabled={idx === orderedCards.length - 1}
                      className="text-xs px-1 disabled:opacity-30 hover:text-primary"
                    >▼</button>
                  </div>
                  <span className={cn('flex-1 text-sm', hidden && 'line-through text-muted-foreground')}>{card.label}</span>
                  <Switch checked={!hidden} onCheckedChange={() => toggleHidden(id)} />
                </div>
              );
            })}
          </div>
        </section>

        {/* Tema */}
        <section className="card-finance">
          <h2 className="font-semibold mb-3 flex items-center gap-2"><Sun size={18} /> Tema</h2>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'light', label: 'Claro', icon: <Sun size={16} /> },
              { id: 'dark', label: 'Escuro', icon: <Moon size={16} /> },
              { id: 'auto', label: 'Automático', icon: <MonitorSmartphone size={16} /> },
            ].map(opt => (
              <button
                key={opt.id}
                onClick={() => {
                  setThemeMode(opt.id as 'light' | 'dark' | 'auto');
                  if (opt.id !== 'auto') setTheme(opt.id as 'light' | 'dark');
                }}
                className={cn(
                  'flex flex-col items-center gap-1.5 p-3 rounded-xl touch-scale transition-all',
                  themeMode === opt.id ? 'bg-primary/15 ring-2 ring-primary' : 'bg-secondary/50 hover:bg-secondary',
                )}
              >
                {opt.icon}
                <span className="text-xs font-medium">{opt.label}</span>
              </button>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground mt-2">
            {themeMode === 'auto' ? 'Segue automaticamente o tema do sistema.' : `Aparência ${theme === 'dark' ? 'escura' : 'clara'} ativa.`}
          </p>
        </section>

        {/* Cor principal */}
        <section className="card-finance">
          <h2 className="font-semibold mb-3 flex items-center gap-2"><Palette size={18} /> Cor principal</h2>
          <div className="grid grid-cols-2 gap-2">
            {COLOR_SCHEMES.map((scheme) => (
              <button
                key={scheme.id}
                onClick={() => setColorScheme(scheme.id)}
                className={cn(
                  'flex items-center gap-3 p-3 rounded-xl transition-all touch-scale text-left',
                  colorScheme === scheme.id ? 'bg-primary/15 ring-2 ring-primary' : 'bg-secondary/50 hover:bg-secondary',
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
        </section>

        {/* Layout / Density */}
        <section className="card-finance">
          <h2 className="font-semibold mb-3 flex items-center gap-2"><Gauge size={18} /> Layout</h2>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'compact', label: 'Compacto', desc: 'Mais informação' },
              { id: 'comfortable', label: 'Confortável', desc: 'Equilibrado' },
              { id: 'spacious', label: 'Espaçoso', desc: 'Mais respiro' },
            ].map(opt => (
              <button
                key={opt.id}
                onClick={() => setDensity(opt.id as 'compact' | 'comfortable' | 'spacious')}
                className={cn(
                  'p-3 rounded-xl text-left transition-all touch-scale',
                  density === opt.id ? 'bg-primary/15 ring-2 ring-primary' : 'bg-secondary/50 hover:bg-secondary',
                )}
              >
                <p className="text-sm font-medium">{opt.label}</p>
                <p className="text-[10px] text-muted-foreground">{opt.desc}</p>
              </button>
            ))}
          </div>

        </section>

        {/* Animações */}
        <section className="card-finance">
          <h2 className="font-semibold mb-3 flex items-center gap-2"><Sparkles size={18} /> Animações</h2>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'on', label: 'Ativas', icon: <Zap size={16} /> },
              { id: 'reduced', label: 'Reduzidas', icon: <Sparkles size={16} /> },
              { id: 'off', label: 'Desativadas', icon: <ZapOff size={16} /> },
            ].map(opt => (
              <button
                key={opt.id}
                onClick={() => setAnimations(opt.id as 'on' | 'reduced' | 'off')}
                className={cn(
                  'flex flex-col items-center gap-1.5 p-3 rounded-xl touch-scale transition-all',
                  animations === opt.id ? 'bg-primary/15 ring-2 ring-primary' : 'bg-secondary/50 hover:bg-secondary',
                )}
              >
                {opt.icon}
                <span className="text-xs font-medium">{opt.label}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Menu */}
        <section className="card-finance">
          <h2 className="font-semibold mb-3 flex items-center gap-2"><MenuIcon size={18} /> Menu</h2>
          <p className="text-xs text-muted-foreground mb-2">Barra inferior (mobile)</p>
          <div className="space-y-1.5 mb-4">
            {MENU_ITEMS.map(m => (
              <div key={m.id} className="flex items-center justify-between p-2 rounded-xl bg-secondary/40">
                <span className="text-sm">{m.label}</span>
                <Switch
                  checked={!menu.bottomHidden.includes(m.id)}
                  onCheckedChange={() => toggleMenuHidden('bottom', m.id)}
                />
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mb-2">Barra lateral (desktop)</p>
          <div className="space-y-1.5">
            {MENU_ITEMS.map(m => (
              <div key={m.id} className="flex items-center justify-between p-2 rounded-xl bg-secondary/40">
                <span className="text-sm">{m.label}</span>
                <Switch
                  checked={!menu.sidebarHidden.includes(m.id)}
                  onCheckedChange={() => toggleMenuHidden('sidebar', m.id)}
                />
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
