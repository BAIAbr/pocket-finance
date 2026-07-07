import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface SecurityEvent {
  id: string;
  event_type: string;
  ip_address: string | null;
  user_agent: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface UserSessionRow {
  id: string;
  login_at: string;
  logout_at: string | null;
  duration_minutes: number | null;
}

export function useSecurityEvents(userId: string | undefined) {
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [sessions, setSessions] = useState<UserSessionRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const [{ data: ev }, { data: se }] = await Promise.all([
      supabase
        .from('security_events')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50),
      supabase
        .from('user_sessions')
        .select('id, login_at, logout_at, duration_minutes')
        .eq('user_id', userId)
        .order('login_at', { ascending: false })
        .limit(30),
    ]);
    setEvents((ev as SecurityEvent[]) ?? []);
    setSessions((se as UserSessionRow[]) ?? []);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  const logEvent = async (event_type: string, metadata?: Record<string, unknown>) => {
    if (!userId) return;
    await supabase.from('security_events').insert([{
      user_id: userId,
      event_type,
      user_agent: navigator.userAgent,
      metadata: (metadata ?? {}) as any,
    }]);
    await load();
  };

  return { events, sessions, loading, reload: load, logEvent };
}
