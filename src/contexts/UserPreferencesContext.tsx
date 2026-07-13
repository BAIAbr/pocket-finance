import React, { createContext, useContext, useEffect } from 'react';
import { useLocalStorage } from '@/hooks/useLocalStorage';

export type Density = 'compact' | 'comfortable';
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
}

export interface MenuLayout {
  bottomHidden: string[];
  sidebarHidden: string[];
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
  incomes: true,
  expenses: true,
  goals: true,
  planning: true,
  investments: true,
  cards: true,
  subscriptions: true,
  upcomingBills: true,
  weeklyDigest: true,
  monthlyDigest: true,
  news: true,
  updates: true,
};

const DEFAULT_LABS: LabFlags = {
  newDashboard: false,
  newPlanning: false,
  financialRadar: false,
  financialHealth: false,
  foxAssistant: false,
};

const DEFAULT_DASHBOARD_LAYOUT: DashboardLayout = {
  order: ['balance', 'weeklySummary', 'quickDeposit', 'upcomingBills', 'missions', 'chart', 'transactions'],
  hidden: [],
  preset: 'custom',
};

const DEFAULT_MENU: MenuLayout = {
  bottomHidden: [],
  sidebarHidden: [],
};

const DEFAULT_PREFS: RegionalPreferences = {
  language: 'pt-BR',
  currency: 'BRL',
  dateFormat: 'dd/MM/yyyy',
  weekStart: 'sunday',
  timezone: 'America/Sao_Paulo',
  numberFormat: 'pt-BR',
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
}

const UserPreferencesContext = createContext<UserPreferencesContextValue | null>(null);

export function UserPreferencesProvider({ children }: { children: React.ReactNode }) {
  const [density, setDensity] = useLocalStorage<Density>('finango.density', 'comfortable');
  const [animations, setAnimations] = useLocalStorage<AnimationsMode>('finango.animations', 'on');
  const [notifications, setNotifications] = useLocalStorage<NotificationPrefs>('finango.notifications', DEFAULT_NOTIF);
  const [labs, setLabs] = useLocalStorage<LabFlags>('finango.labs', DEFAULT_LABS);
  const [dashboardLayout, setDashboardLayout] = useLocalStorage<DashboardLayout>('finango.dashboardLayout', DEFAULT_DASHBOARD_LAYOUT);
  const [menu, setMenu] = useLocalStorage<MenuLayout>('finango.menu', DEFAULT_MENU);
  const [regional, setRegional] = useLocalStorage<RegionalPreferences>('finango.regional', DEFAULT_PREFS);
  const [themeMode, setThemeMode] = useLocalStorage<'light' | 'dark' | 'auto'>('finango.themeMode', 'dark');

  const setNotification = (k: keyof NotificationPrefs, v: boolean) => {
    setNotifications({ ...notifications, [k]: v });
  };
  const setLab = (k: keyof LabFlags, v: boolean) => {
    setLabs({ ...labs, [k]: v });
  };

  // Apply density + animations to <html>
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('density-compact', 'density-comfortable');
    root.classList.add(`density-${density}`);
  }, [density]);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('anim-on', 'anim-reduced', 'anim-off');
    root.classList.add(`anim-${animations}`);
  }, [animations]);

  // Apply themeMode 'auto' — follow system
  useEffect(() => {
    if (themeMode !== 'auto') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      const root = document.documentElement;
      if (mq.matches) {
        root.classList.add('dark');
        root.classList.remove('light');
      } else {
        root.classList.add('light');
        root.classList.remove('dark');
      }
    };
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [themeMode]);

  return (
    <UserPreferencesContext.Provider
      value={{
        density,
        setDensity,
        animations,
        setAnimations,
        notifications,
        setNotification,
        labs,
        setLab,
        dashboardLayout,
        setDashboardLayout,
        menu,
        setMenu,
        regional,
        setRegional,
        themeMode,
        setThemeMode,
      }}
    >
      {children}
    </UserPreferencesContext.Provider>
  );
}

export function useUserPreferences() {
  const ctx = useContext(UserPreferencesContext);
  if (!ctx) {
    // Fallback defensivo — evita blank screens durante HMR
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
    };
  }
  return ctx;
}
