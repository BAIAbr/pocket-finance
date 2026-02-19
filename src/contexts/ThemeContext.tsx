import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

export type ColorScheme = 'purple' | 'blue' | 'green' | 'pink' | 'orange' | 'teal' | 'red';

export const COLOR_SCHEMES: { id: ColorScheme; name: string; preview: string; previewDark: string }[] = [
  { id: 'purple', name: 'Roxo', preview: 'hsl(250, 89%, 60%)', previewDark: 'hsl(250, 89%, 67%)' },
  { id: 'blue', name: 'Azul', preview: 'hsl(217, 91%, 55%)', previewDark: 'hsl(217, 91%, 65%)' },
  { id: 'green', name: 'Verde', preview: 'hsl(152, 69%, 40%)', previewDark: 'hsl(152, 69%, 50%)' },
  { id: 'pink', name: 'Rosa', preview: 'hsl(330, 81%, 55%)', previewDark: 'hsl(330, 81%, 65%)' },
  { id: 'orange', name: 'Laranja', preview: 'hsl(25, 95%, 53%)', previewDark: 'hsl(25, 95%, 60%)' },
  { id: 'teal', name: 'Ciano', preview: 'hsl(187, 72%, 42%)', previewDark: 'hsl(187, 72%, 52%)' },
  { id: 'red', name: 'Vermelho', preview: 'hsl(0, 72%, 51%)', previewDark: 'hsl(0, 72%, 58%)' },
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
      return (stored as ColorScheme) || 'purple';
    }
    return 'purple';
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
    // Remove all scheme classes
    COLOR_SCHEMES.forEach(s => root.classList.remove(`scheme-${s.id}`));
    // Add current scheme
    if (colorScheme !== 'purple') {
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
