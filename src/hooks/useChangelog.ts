import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { ChangelogEntryRow } from '@/lib/documents/types';

export function useChangelog() {
  const [entries, setEntries] = useState<ChangelogEntryRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const { data } = await supabase
        .from('changelog_entries')
        .select('*')
        .eq('status', 'published')
        .order('published_at', { ascending: false });
      if (!mounted) return;
      setEntries((data as any) ?? []);
      setLoading(false);
    };
    load();
    const channel = supabase
      .channel('changelog:list')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'changelog_entries' }, load)
      .subscribe();
    return () => { mounted = false; supabase.removeChannel(channel); };
  }, []);

  return { entries, loading };
}

export function useChangelogHighlight() {
  const { user } = useAuth();
  const [entry, setEntry] = useState<ChangelogEntryRow | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) { setEntry(null); setLoading(false); return; }
    const { data: highlights } = await supabase
      .from('changelog_entries')
      .select('*')
      .eq('status', 'published')
      .eq('is_highlight', true)
      .order('published_at', { ascending: false });
    if (!highlights || highlights.length === 0) { setEntry(null); setLoading(false); return; }

    const { data: views } = await supabase
      .from('changelog_views')
      .select('entry_id')
      .eq('user_id', user.id);
    const seen = new Set((views ?? []).map(v => v.entry_id));
    const next = highlights.find(e => !seen.has(e.id)) ?? null;
    setEntry((next as any) ?? null);
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const dismiss = useCallback(async () => {
    if (!user || !entry) return;
    await supabase.from('changelog_views').insert({ user_id: user.id, entry_id: entry.id });
    setEntry(null);
  }, [user, entry]);

  return { entry, loading, dismiss };
}
