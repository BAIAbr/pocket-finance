import { createContext, useContext, useEffect, useMemo } from 'react';
import { useActiveTheme } from '@/hooks/useActiveTheme';
import type { ThemeSettings } from '@/lib/theme/types';

interface AppearanceContextValue {
  activeTheme: ThemeSettings | null;
  isLoading: boolean;
}

const AppearanceContext = createContext<AppearanceContextValue>({
  activeTheme: null,
  isLoading: true,
});

const STYLE_ELEMENT_ID = 'finango-active-theme';

/**
 * Builds a `<style>` block that overrides CSS custom properties for the
 * active theme. Uses `:root` + `.dark` selectors — same specificity as
 * `index.css` — so it's safely overridden by any inline scheme vars set by
 * `ThemeContext` (colorScheme picker). This means turning on Theme Manager
 * NEVER breaks the existing color-scheme feature.
 */
function buildStyleSheet(theme: ThemeSettings): string {
  const lightVars = Object.entries(theme.tokens_light ?? {})
    .map(([k, v]) => `  --${k}: ${v};`)
    .join('\n');

  const darkVars = Object.entries(theme.tokens_dark ?? {})
    .map(([k, v]) => `  --${k}: ${v};`)
    .join('\n');

  const typography = Object.entries(theme.typography ?? {})
    .map(([k, v]) => `  --${k}: ${v};`)
    .join('\n');

  const layout = Object.entries(theme.layout ?? {})
    .map(([k, v]) => `  --${k}: ${v};`)
    .join('\n');

  return [
    lightVars && `:root {\n${lightVars}\n}`,
    darkVars && `.dark {\n${darkVars}\n}`,
    (typography || layout) &&
      `:root {\n${[typography, layout].filter(Boolean).join('\n')}\n}`,
  ]
    .filter(Boolean)
    .join('\n\n');
}

function ensureStyleElement(): HTMLStyleElement {
  let el = document.getElementById(STYLE_ELEMENT_ID) as HTMLStyleElement | null;
  if (!el) {
    el = document.createElement('style');
    el.id = STYLE_ELEMENT_ID;
    el.setAttribute('data-source', 'finango-theme-manager');
    document.head.appendChild(el);
  }
  return el;
}

function updateFavicon(url: string | null | undefined) {
  if (!url) return;
  let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
  if (!link) {
    link = document.createElement('link');
    link.rel = 'icon';
    document.head.appendChild(link);
  }
  link.href = url;
}

export function AppearanceProvider({ children }: { children: React.ReactNode }) {
  const { theme, isLoading } = useActiveTheme();

  useEffect(() => {
    if (!theme) return;
    const el = ensureStyleElement();
    el.textContent = buildStyleSheet(theme);

    // Identity: browser title + favicon
    if (theme.identity?.browser_title) {
      document.title = theme.identity.browser_title;
    }
    updateFavicon(theme.identity?.favicon_url);
  }, [theme]);

  const value = useMemo(
    () => ({ activeTheme: theme, isLoading }),
    [theme, isLoading],
  );

  return (
    <AppearanceContext.Provider value={value}>
      {children}
    </AppearanceContext.Provider>
  );
}

export function useAppearance() {
  return useContext(AppearanceContext);
}
