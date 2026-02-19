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

  useEffect(() => {
    const root = document.documentElement;
    COLOR_SCHEMES.forEach(s => root.classList.remove(`scheme-${s.id}`));
    if (colorScheme !== 'default') {
      root.classList.add(`scheme-${colorScheme}`);
    }
    localStorage.setItem(COLOR_SCHEME_KEY, colorScheme);
  }, [colorScheme]);

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
