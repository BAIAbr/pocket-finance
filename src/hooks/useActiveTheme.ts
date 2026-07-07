import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { ThemeSettings } from '@/lib/theme/types';

/**
 * Fetches the currently active theme from `public.theme_settings`.
 * Subscribes to realtime updates so admin edits reflect immediately.
 * Returns `null` while loading or if no active theme exists (app falls back
 * to the compiled tokens in index.css — safe no-op).
 */
export function useActiveTheme() {
  const [theme, setTheme] = useState<ThemeSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const { data, error } = await supabase
        .from('theme_settings')
        .select('*')
        .eq('is_active', true)
        .maybeSingle();

      if (cancelled) return;
      if (!error && data) setTheme(data as unknown as ThemeSettings);
      setIsLoading(false);
    };

    load();

    const channel = supabase
      .channel('theme_settings_active')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'theme_settings' },
        () => {
          load();
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, []);

  return { theme, isLoading };
}
