import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type Density = 'compact' | 'comfortable' | 'spacious';
export type AnimationsMode = 'on' | 'reduced' | 'off';

export interface NotificationPrefs {
  incomes: boolean;
  expenses: boolean;
  goals: boolean;
  planning: boolean;
  investments: boolean;
  cards: boolean;
  subscriptions: boolean;
  upcomingBills: boolean;
  weeklyDigest: boolean;
  monthlyDigest: boolean;
  news: boolean;
  updates: boolean;
}

export interface LabFlags {
  newDashboard: boolean;
  newPlanning: boolean;
  financialRadar: boolean;
  financialHealth: boolean;
  foxAssistant: boolean;
}

export interface DashboardLayout {
  order: string[];
  hidden: string[];
  preset: 'essential' | 'investor' | 'planning' | 'business' | 'custom';
  sizes?: Record<string, 'sm' | 'md' | 'lg'>;
}

export interface MenuLayout {
  bottomHidden: string[];
  sidebarHidden: string[];
  order?: string[];
}

export interface RegionalPreferences {
  language: 'pt-BR' | 'en-US' | 'es-ES';
  currency: 'BRL' | 'USD' | 'EUR';
  dateFormat: 'dd/MM/yyyy' | 'MM/dd/yyyy' | 'yyyy-MM-dd';
  weekStart: 'sunday' | 'monday';
  timezone: string;
  numberFormat: 'pt-BR' | 'en-US';
}

const DEFAULT_NOTIF: NotificationPrefs = {
  incomes: true, expenses: true, goals: true, planning: true,
  investments: true, cards: true, subscriptions: true, upcomingBills: true,
  weeklyDigest: true, monthlyDigest: true, news: true, updates: true,
};

const DEFAULT_LABS: LabFlags = {
  newDashboard: false, newPlanning: false, financialRadar: false,
  financialHealth: false, foxAssistant: false,
};

const DEFAULT_DASHBOARD_LAYOUT: DashboardLayout = {
  order: ['balance', 'weeklySummary', 'quickDeposit', 'upcomingBills', 'missions', 'chart', 'transactions'],
  hidden: [],
  preset: 'custom',
  sizes: {},
};

const DEFAULT_MENU: MenuLayout = { bottomHidden: [], sidebarHidden: [], order: [] };

const DEFAULT_PREFS: RegionalPreferences = {
  language: 'pt-BR', currency: 'BRL', dateFormat: 'dd/MM/yyyy',
  weekStart: 'sunday', timezone: 'America/Sao_Paulo', numberFormat: 'pt-BR',
};

interface UserPreferencesContextValue {
  density: Density;
  setDensity: (v: Density) => void;
  animations: AnimationsMode;
  setAnimations: (v: AnimationsMode) => void;
  notifications: NotificationPrefs;
  setNotification: (k: keyof NotificationPrefs, v: boolean) => void;
  labs: LabFlags;
  setLab: (k: keyof LabFlags, v: boolean) => void;
  dashboardLayout: DashboardLayout;
  setDashboardLayout: (v: DashboardLayout | ((prev: DashboardLayout) => DashboardLayout)) => void;
  menu: MenuLayout;
  setMenu: (v: MenuLayout | ((prev: MenuLayout) => MenuLayout)) => void;
  regional: RegionalPreferences;
  setRegional: (v: RegionalPreferences | ((prev: RegionalPreferences) => RegionalPreferences)) => void;
  themeMode: 'light' | 'dark' | 'auto';
  setThemeMode: (v: 'light' | 'dark' | 'auto') => void;
  primaryColor: string | null;
  setPrimaryColor: (v: string | null) => void;
  isSyncing: boolean;
}

const UserPreferencesContext = createContext<UserPreferencesContextValue | null>(null);

export function UserPreferencesProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  // Local cache (kept as offline fallback + optimistic UI while loading)
  const [density, setDensityLS] = useLocalStorage<Density>('finango.density', 'comfortable');
  const [animations, setAnimationsLS] = useLocalStorage<AnimationsMode>('finango.animations', 'on');
  const [notifications, setNotificationsLS] = useLocalStorage<NotificationPrefs>('finango.notifications', DEFAULT_NOTIF);
  const [labs, setLabsLS] = useLocalStorage<LabFlags>('finango.labs', DEFAULT_LABS);
  const [dashboardLayout, setDashboardLayoutLS] = useLocalStorage<DashboardLayout>('finango.dashboardLayout', DEFAULT_DASHBOARD_LAYOUT);
  const [menu, setMenuLS] = useLocalStorage<MenuLayout>('finango.menu', DEFAULT_MENU);
  const [regional, setRegionalLS] = useLocalStorage<RegionalPreferences>('finango.regional', DEFAULT_PREFS);
  const [themeMode, setThemeModeLS] = useLocalStorage<'light' | 'dark' | 'auto'>('finango.themeMode', 'dark');
  const [primaryColor, setPrimaryColorLS] = useLocalStorage<string | null>('finango.primaryColor', null);

  const [isSyncing, setIsSyncing] = useState(false);
  const remoteRef = useRef<Record<string, unknown> | null>(null);
  const skipNextRealtime = useRef(false);
  const debounceRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // Load from Supabase on login
  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (cancelled) return;

      if (error) {
        console.error('Load preferences error:', error);
        return;
      }

      if (!data) {
        // Seed defaults for legacy users
        await supabase.from('user_preferences').insert({ user_id: user.id });
        return;
      }

      remoteRef.current = data as Record<string, unknown>;
      if (data.theme_mode) setThemeModeLS(data.theme_mode as 'light' | 'dark' | 'auto');
      if (data.density) setDensityLS(data.density as Density);
      if (data.animations) setAnimationsLS(data.animations as AnimationsMode);
      if (data.primary_color !== undefined) setPrimaryColorLS(data.primary_color as string | null);
      if (data.dashboard_layout) setDashboardLayoutLS({ ...DEFAULT_DASHBOARD_LAYOUT, ...(data.dashboard_layout as object) } as DashboardLayout);
      if (data.menu_layout) setMenuLS({ ...DEFAULT_MENU, ...(data.menu_layout as object) } as MenuLayout);
      if (data.notifications) setNotificationsLS({ ...DEFAULT_NOTIF, ...(data.notifications as object) } as NotificationPrefs);
      if (data.regional) setRegionalLS({ ...DEFAULT_PREFS, ...(data.regional as object) } as RegionalPreferences);
      if (data.labs) setLabsLS({ ...DEFAULT_LABS, ...(data.labs as object) } as LabFlags);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Realtime subscription: react to changes from other devices
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`user_prefs_${user.id}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'user_preferences', filter: `user_id=eq.${user.id}`,
      }, (payload) => {
        if (skipNextRealtime.current) { skipNextRealtime.current = false; return; }
        const row = payload.new as Record<string, unknown>;
        if (!row) return;
        if (row.theme_mode) setThemeModeLS(row.theme_mode as 'light' | 'dark' | 'auto');
        if (row.density) setDensityLS(row.density as Density);
        if (row.animations) setAnimationsLS(row.animations as AnimationsMode);
        if ('primary_color' in row) setPrimaryColorLS(row.primary_color as string | null);
        if (row.dashboard_layout) setDashboardLayoutLS(row.dashboard_layout as DashboardLayout);
        if (row.menu_layout) setMenuLS(row.menu_layout as MenuLayout);
        if (row.notifications) setNotificationsLS(row.notifications as NotificationPrefs);
        if (row.regional) setRegionalLS(row.regional as RegionalPreferences);
        if (row.labs) setLabsLS(row.labs as LabFlags);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Debounced upsert helper (per column)
  const pushRemote = useCallback((patch: Record<string, unknown>) => {
    if (!user?.id) return;
    const key = Object.keys(patch).join(',');
    if (debounceRef.current[key]) clearTimeout(debounceRef.current[key]);
    setIsSyncing(true);
    debounceRef.current[key] = setTimeout(async () => {
      skipNextRealtime.current = true;
      const { error } = await supabase
        .from('user_preferences')
        .upsert({ user_id: user.id, ...patch }, { onConflict: 'user_id' });
      if (error) console.error('Save preferences error:', error);
      setIsSyncing(false);
    }, 400);
  }, [user?.id]);

  // Wrapped setters (update LS + push remote)
  const setDensity = (v: Density) => { setDensityLS(v); pushRemote({ density: v }); };
  const setAnimations = (v: AnimationsMode) => { setAnimationsLS(v); pushRemote({ animations: v }); };
  const setThemeMode = (v: 'light' | 'dark' | 'auto') => { setThemeModeLS(v); pushRemote({ theme_mode: v }); };
  const setPrimaryColor = (v: string | null) => { setPrimaryColorLS(v); pushRemote({ primary_color: v }); };
  const setNotification = (k: keyof NotificationPrefs, v: boolean) => {
    const next = { ...notifications, [k]: v };
    setNotificationsLS(next); pushRemote({ notifications: next });
  };
  const setLab = (k: keyof LabFlags, v: boolean) => {
    const next = { ...labs, [k]: v };
    setLabsLS(next); pushRemote({ labs: next });
  };
  const setDashboardLayout = (v: DashboardLayout | ((prev: DashboardLayout) => DashboardLayout)) => {
    const next = typeof v === 'function' ? (v as (p: DashboardLayout) => DashboardLayout)(dashboardLayout) : v;
    setDashboardLayoutLS(next); pushRemote({ dashboard_layout: next });
  };
  const setMenu = (v: MenuLayout | ((prev: MenuLayout) => MenuLayout)) => {
    const next = typeof v === 'function' ? (v as (p: MenuLayout) => MenuLayout)(menu) : v;
    setMenuLS(next); pushRemote({ menu_layout: next });
  };
  const setRegional = (v: RegionalPreferences | ((prev: RegionalPreferences) => RegionalPreferences)) => {
    const next = typeof v === 'function' ? (v as (p: RegionalPreferences) => RegionalPreferences)(regional) : v;
    setRegionalLS(next); pushRemote({ regional: next });
  };

  // Apply density
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('density-compact', 'density-comfortable', 'density-spacious');
    root.classList.add(`density-${density}`);
  }, [density]);

  // Apply animations
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('anim-on', 'anim-reduced', 'anim-off');
    root.classList.add(`anim-${animations}`);
  }, [animations]);

  // Apply primary color (CSS var override). Accepts "H S% L%" or hex.
  useEffect(() => {
    const root = document.documentElement;
    if (!primaryColor) {
      root.style.removeProperty('--primary-user');
      return;
    }
    // Convert hex to HSL if needed
    let hsl = primaryColor.trim();
    if (hsl.startsWith('#')) {
      const h = hexToHsl(hsl);
      if (h) hsl = h;
    }
    root.style.setProperty('--primary-user', hsl);
    root.style.setProperty('--primary', hsl);
  }, [primaryColor]);

  // Auto theme mode
  useEffect(() => {
    if (themeMode !== 'auto') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      const root = document.documentElement;
      if (mq.matches) { root.classList.add('dark'); root.classList.remove('light'); }
      else { root.classList.add('light'); root.classList.remove('dark'); }
    };
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [themeMode]);

  return (
    <UserPreferencesContext.Provider
      value={{
        density, setDensity,
        animations, setAnimations,
        notifications, setNotification,
        labs, setLab,
        dashboardLayout, setDashboardLayout,
        menu, setMenu,
        regional, setRegional,
        themeMode, setThemeMode,
        primaryColor, setPrimaryColor,
        isSyncing,
      }}
    >
      {children}
    </UserPreferencesContext.Provider>
  );
}

function hexToHsl(hex: string): string | null {
  const m = hex.replace('#', '').match(/^([0-9a-f]{6}|[0-9a-f]{3})$/i);
  if (!m) return null;
  let h = m[1];
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let H = 0, S = 0; const L = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    S = L > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: H = (g - b) / d + (g < b ? 6 : 0); break;
      case g: H = (b - r) / d + 2; break;
      case b: H = (r - g) / d + 4; break;
    }
    H /= 6;
  }
  return `${Math.round(H * 360)} ${Math.round(S * 100)}% ${Math.round(L * 100)}%`;
}

export function useUserPreferences() {
  const ctx = useContext(UserPreferencesContext);
  if (!ctx) {
    return {
      density: 'comfortable' as Density,
      setDensity: () => {},
      animations: 'on' as AnimationsMode,
      setAnimations: () => {},
      notifications: DEFAULT_NOTIF,
      setNotification: () => {},
      labs: DEFAULT_LABS,
      setLab: () => {},
      dashboardLayout: DEFAULT_DASHBOARD_LAYOUT,
      setDashboardLayout: () => {},
      menu: DEFAULT_MENU,
      setMenu: () => {},
      regional: DEFAULT_PREFS,
      setRegional: () => {},
      themeMode: 'dark' as const,
      setThemeMode: () => {},
      primaryColor: null,
      setPrimaryColor: () => {},
      isSyncing: false,
    };
  }
  return ctx;
}
