import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

export type ColorScheme = 'default' | 'ocean' | 'forest' | 'sunset' | 'midnight' | 'cherry' | 'arctic';

export const COLOR_SCHEMES: { id: ColorScheme; name: string; emoji: string; description: string }[] = [
  { id: 'default', name: 'Padrão', emoji: '💜', description: 'Roxo clássico' },
  { id: 'ocean', name: 'Oceano', emoji: '🌊', description: 'Azul profundo' },
  { id: 'forest', name: 'Floresta', emoji: '🌲', description: 'Verde natural' },
  { id: 'sunset', name: 'Pôr do Sol', emoji: '🌅', description: 'Laranja quente' },
  { id: 'midnight', name: 'Midnight', emoji: '🌙', description: 'Índigo escuro' },
  { id: 'cherry', name: 'Cereja', emoji: '🍒', description: 'Rosa intenso' },
  { id: 'arctic', name: 'Ártico', emoji: '❄️', description: 'Ciano gelado' },
];

interface SchemeVars {
  light: Record<string, string>;
  dark: Record<string, string>;
}

const SCHEME_VARS: Record<string, SchemeVars> = {
  ocean: {
    light: {
      '--primary': '210 100% 50%',
      '--accent': '210 100% 50%',
      '--ring': '210 100% 50%',
      '--background': '210 30% 96%',
      '--card': '210 25% 100%',
      '--secondary': '210 20% 90%',
      '--muted': '210 20% 93%',
      '--border': '210 18% 85%',
      '--input': '210 20% 90%',
      '--balance-start': '210 100% 50%',
      '--balance-end': '195 95% 44%',
      '--sidebar-primary': '210 100% 50%',
      '--sidebar-ring': '210 100% 50%',
      '--sidebar-background': '210 25% 100%',
      '--sidebar-accent': '210 20% 90%',
      '--sidebar-border': '210 18% 85%',
    },
    dark: {
      '--primary': '210 100% 62%',
      '--accent': '210 100% 62%',
      '--ring': '210 100% 62%',
      '--background': '215 50% 5%',
      '--card': '215 45% 8%',
      '--secondary': '215 35% 13%',
      '--muted': '215 35% 11%',
      '--border': '215 30% 16%',
      '--input': '215 35% 13%',
      '--popover': '215 45% 9%',
      '--balance-start': '210 100% 62%',
      '--balance-end': '195 95% 52%',
      '--sidebar-primary': '210 100% 62%',
      '--sidebar-ring': '210 100% 62%',
      '--sidebar-background': '215 50% 5%',
      '--sidebar-accent': '215 35% 13%',
      '--sidebar-border': '215 30% 16%',
    },
  },
  forest: {
    light: {
      '--primary': '152 69% 36%',
      '--accent': '152 69% 36%',
      '--ring': '152 69% 36%',
      '--background': '140 20% 96%',
      '--card': '140 15% 100%',
      '--secondary': '140 14% 90%',
      '--muted': '140 14% 93%',
      '--border': '140 12% 85%',
      '--input': '140 14% 90%',
      '--balance-start': '152 69% 36%',
      '--balance-end': '168 76% 32%',
      '--sidebar-primary': '152 69% 36%',
      '--sidebar-ring': '152 69% 36%',
      '--sidebar-background': '140 15% 100%',
      '--sidebar-accent': '140 14% 90%',
      '--sidebar-border': '140 12% 85%',
    },
    dark: {
      '--primary': '152 69% 48%',
      '--accent': '152 69% 48%',
      '--ring': '152 69% 48%',
      '--background': '150 30% 5%',
      '--card': '150 28% 8%',
      '--secondary': '150 22% 13%',
      '--muted': '150 22% 11%',
      '--border': '150 20% 16%',
      '--input': '150 22% 13%',
      '--popover': '150 28% 9%',
      '--balance-start': '152 69% 48%',
      '--balance-end': '168 76% 42%',
      '--sidebar-primary': '152 69% 48%',
      '--sidebar-ring': '152 69% 48%',
      '--sidebar-background': '150 30% 5%',
      '--sidebar-accent': '150 22% 13%',
      '--sidebar-border': '150 20% 16%',
    },
  },
  sunset: {
    light: {
      '--primary': '25 95% 53%',
      '--accent': '25 95% 53%',
      '--ring': '25 95% 53%',
      '--background': '30 30% 96%',
      '--card': '30 20% 100%',
      '--secondary': '30 18% 90%',
      '--muted': '30 18% 93%',
      '--border': '30 15% 85%',
      '--input': '30 18% 90%',
      '--balance-start': '25 95% 53%',
      '--balance-end': '10 90% 50%',
      '--sidebar-primary': '25 95% 53%',
      '--sidebar-ring': '25 95% 53%',
      '--sidebar-background': '30 20% 100%',
      '--sidebar-accent': '30 18% 90%',
      '--sidebar-border': '30 15% 85%',
    },
    dark: {
      '--primary': '25 95% 60%',
      '--accent': '25 95% 60%',
      '--ring': '25 95% 60%',
      '--background': '20 40% 5%',
      '--card': '20 35% 8%',
      '--secondary': '20 28% 13%',
      '--muted': '20 28% 11%',
      '--border': '20 24% 16%',
      '--input': '20 28% 13%',
      '--popover': '20 35% 9%',
      '--balance-start': '25 95% 60%',
      '--balance-end': '10 90% 55%',
      '--sidebar-primary': '25 95% 60%',
      '--sidebar-ring': '25 95% 60%',
      '--sidebar-background': '20 40% 5%',
      '--sidebar-accent': '20 28% 13%',
      '--sidebar-border': '20 24% 16%',
    },
  },
  midnight: {
    light: {
      '--primary': '235 75% 55%',
      '--accent': '235 75% 55%',
      '--ring': '235 75% 55%',
      '--background': '235 20% 95%',
      '--card': '235 15% 100%',
      '--secondary': '235 14% 90%',
      '--muted': '235 14% 93%',
      '--border': '235 12% 85%',
      '--input': '235 14% 90%',
      '--balance-start': '235 75% 55%',
      '--balance-end': '260 70% 52%',
      '--sidebar-primary': '235 75% 55%',
      '--sidebar-ring': '235 75% 55%',
      '--sidebar-background': '235 15% 100%',
      '--sidebar-accent': '235 14% 90%',
      '--sidebar-border': '235 12% 85%',
    },
    dark: {
      '--primary': '235 75% 65%',
      '--accent': '235 75% 65%',
      '--ring': '235 75% 65%',
      '--background': '235 45% 4%',
      '--card': '235 40% 7%',
      '--secondary': '235 30% 12%',
      '--muted': '235 30% 10%',
      '--border': '235 25% 15%',
      '--input': '235 30% 12%',
      '--popover': '235 40% 8%',
      '--balance-start': '235 75% 65%',
      '--balance-end': '260 70% 60%',
      '--sidebar-primary': '235 75% 65%',
      '--sidebar-ring': '235 75% 65%',
      '--sidebar-background': '235 45% 4%',
      '--sidebar-accent': '235 30% 12%',
      '--sidebar-border': '235 25% 15%',
    },
  },
  cherry: {
    light: {
      '--primary': '340 82% 52%',
      '--accent': '340 82% 52%',
      '--ring': '340 82% 52%',
      '--background': '340 20% 96%',
      '--card': '340 15% 100%',
      '--secondary': '340 14% 90%',
      '--muted': '340 14% 93%',
      '--border': '340 12% 86%',
      '--input': '340 14% 90%',
      '--balance-start': '340 82% 52%',
      '--balance-end': '320 75% 48%',
      '--sidebar-primary': '340 82% 52%',
      '--sidebar-ring': '340 82% 52%',
      '--sidebar-background': '340 15% 100%',
      '--sidebar-accent': '340 14% 90%',
      '--sidebar-border': '340 12% 86%',
    },
    dark: {
      '--primary': '340 82% 62%',
      '--accent': '340 82% 62%',
      '--ring': '340 82% 62%',
      '--background': '340 35% 5%',
      '--card': '340 30% 8%',
      '--secondary': '340 24% 13%',
      '--muted': '340 24% 11%',
      '--border': '340 20% 16%',
      '--input': '340 24% 13%',
      '--popover': '340 30% 9%',
      '--balance-start': '340 82% 62%',
      '--balance-end': '320 75% 56%',
      '--sidebar-primary': '340 82% 62%',
      '--sidebar-ring': '340 82% 62%',
      '--sidebar-background': '340 35% 5%',
      '--sidebar-accent': '340 24% 13%',
      '--sidebar-border': '340 20% 16%',
    },
  },
  arctic: {
    light: {
      '--primary': '187 72% 42%',
      '--accent': '187 72% 42%',
      '--ring': '187 72% 42%',
      '--background': '190 25% 96%',
      '--card': '190 18% 100%',
      '--secondary': '190 16% 90%',
      '--muted': '190 16% 93%',
      '--border': '190 14% 85%',
      '--input': '190 16% 90%',
      '--balance-start': '187 72% 42%',
      '--balance-end': '174 68% 38%',
      '--sidebar-primary': '187 72% 42%',
      '--sidebar-ring': '187 72% 42%',
      '--sidebar-background': '190 18% 100%',
      '--sidebar-accent': '190 16% 90%',
      '--sidebar-border': '190 14% 85%',
    },
    dark: {
      '--primary': '187 72% 52%',
      '--accent': '187 72% 52%',
      '--ring': '187 72% 52%',
      '--background': '190 40% 5%',
      '--card': '190 35% 8%',
      '--secondary': '190 28% 13%',
      '--muted': '190 28% 11%',
      '--border': '190 22% 16%',
      '--input': '190 28% 13%',
      '--popover': '190 35% 9%',
      '--balance-start': '187 72% 52%',
      '--balance-end': '174 68% 46%',
      '--sidebar-primary': '187 72% 52%',
      '--sidebar-ring': '187 72% 52%',
      '--sidebar-background': '190 40% 5%',
      '--sidebar-accent': '190 28% 13%',
      '--sidebar-border': '190 22% 16%',
    },
  },
};

// Track which vars we set so we can remove them
let appliedVarNames: string[] = [];

function applySchemeVars(scheme: ColorScheme, mode: Theme) {
  const root = document.documentElement;

  // Remove previously applied vars
  for (const name of appliedVarNames) {
    root.style.removeProperty(name);
  }
  appliedVarNames = [];

  if (scheme === 'default') return;

  const vars = SCHEME_VARS[scheme]?.[mode];
  if (!vars) return;

  for (const [name, value] of Object.entries(vars)) {
    root.style.setProperty(name, value);
    appliedVarNames.push(name);
  }
}

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  colorScheme: ColorScheme;
  setColorScheme: (scheme: ColorScheme) => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

const THEME_KEY = 'finango-theme';
const COLOR_SCHEME_KEY = 'finango-color-scheme';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(THEME_KEY);
      return (stored as Theme) || 'dark';
    }
    return 'dark';
  });

  const [colorScheme, setColorSchemeState] = useState<ColorScheme>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(COLOR_SCHEME_KEY);
      return (stored as ColorScheme) || 'default';
    }
    return 'default';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
    }
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  // Apply scheme vars via inline styles (bypasses CSS specificity issues)
  useEffect(() => {
    applySchemeVars(colorScheme, theme);
    localStorage.setItem(COLOR_SCHEME_KEY, colorScheme);
  }, [colorScheme, theme]);

  const setTheme = (newTheme: Theme) => setThemeState(newTheme);
  const toggleTheme = () => setThemeState(prev => prev === 'dark' ? 'light' : 'dark');
  const setColorScheme = (scheme: ColorScheme) => setColorSchemeState(scheme);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme, colorScheme, setColorScheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
