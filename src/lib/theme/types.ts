export type ThemeMode = 'light' | 'dark' | 'both';

export interface ThemeIdentity {
  system_name?: string | null;
  browser_title?: string | null;
  logo_url?: string | null;
  logo_reduced_url?: string | null;
  favicon_url?: string | null;
}

export interface ThemeSettings {
  id: string;
  name: string;
  description: string | null;
  mode: ThemeMode;
  is_active: boolean;
  is_default: boolean;
  is_preset: boolean;
  tokens_light: Record<string, string>;
  tokens_dark: Record<string, string>;
  typography: Record<string, string>;
  layout: Record<string, string>;
  identity: ThemeIdentity;
  created_at: string;
  updated_at: string;
}
