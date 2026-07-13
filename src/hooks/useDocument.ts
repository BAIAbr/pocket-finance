import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { DocumentRow } from '@/lib/documents/types';

export function useDocument(slug: string | undefined) {
  const [doc, setDoc] = useState<DocumentRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) { setLoading(false); return; }
    let mounted = true;
    setLoading(true);

    const fetchDoc = async () => {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('slug', slug)
        .eq('status', 'published')
        .maybeSingle();
      if (!mounted) return;
      if (error) setError(error.message);
      setDoc((data as any) ?? null);
      setLoading(false);
    };

    fetchDoc();

    const channel = supabase
      .channel(`doc:${slug}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'documents' }, (payload: any) => {
        const row = (payload.new ?? payload.old) as DocumentRow | undefined;
        if (row?.slug === slug) fetchDoc();
      })
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [slug]);

  return { doc, loading, error };
}
