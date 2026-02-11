import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

const INACTIVITY_TIMEOUT = 15 * 60 * 1000; // 15 minutes

export function useSessionTracker(userId: string | undefined) {
  const sessionIdRef = useRef<string | null>(null);
  const loginTimeRef = useRef<Date | null>(null);
  const inactivityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isEndingRef = useRef(false);

  const endSession = useCallback(async () => {
    if (!sessionIdRef.current || !loginTimeRef.current || !userId || isEndingRef.current) return;
    isEndingRef.current = true;

    const now = new Date();
    const durationMinutes = Math.round((now.getTime() - loginTimeRef.current.getTime()) / 60000 * 100) / 100;

    try {
      // Update session with logout time
      await supabase
        .from('user_sessions')
        .update({ logout_at: now.toISOString(), duration_minutes: durationMinutes })
        .eq('id', sessionIdRef.current);

      // Update analytics
      const { data: analytics } = await supabase
        .from('user_analytics')
        .select('total_time_online, total_sessions')
        .eq('user_id', userId)
        .single();

      if (analytics) {
        const newTotalTime = Number(analytics.total_time_online) + durationMinutes;
        const newTotalSessions = analytics.total_sessions + 1;
        const newAvg = Math.round((newTotalTime / newTotalSessions) * 100) / 100;

        await supabase
          .from('user_analytics')
          .update({
            total_time_online: newTotalTime,
            total_sessions: newTotalSessions,
            average_session_time: newAvg,
          })
          .eq('user_id', userId);
      }
    } catch (e) {
      console.error('Failed to end session:', e);
    }

    sessionIdRef.current = null;
    loginTimeRef.current = null;
    isEndingRef.current = false;
  }, [userId]);

  const startSession = useCallback(async () => {
    if (!userId || sessionIdRef.current) return;

    const now = new Date();
    loginTimeRef.current = now;

    try {
      // Update last_login_at
      await supabase
        .from('user_analytics')
        .update({ last_login_at: now.toISOString() })
        .eq('user_id', userId);

      // Create session record
      const { data } = await supabase
        .from('user_sessions')
        .insert({ user_id: userId, login_at: now.toISOString() })
        .select('id')
        .single();

      if (data) {
        sessionIdRef.current = data.id;
      }
    } catch (e) {
      console.error('Failed to start session:', e);
    }
  }, [userId]);

  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    inactivityTimerRef.current = setTimeout(() => {
      endSession();
    }, INACTIVITY_TIMEOUT);
  }, [endSession]);

  useEffect(() => {
    if (!userId) return;

    startSession();
    resetInactivityTimer();

    // Activity listeners
    const activityEvents = ['mousedown', 'keydown', 'touchstart', 'scroll'];
    const handleActivity = () => {
      resetInactivityTimer();
      // Restart session if it was ended due to inactivity
      if (!sessionIdRef.current && !isEndingRef.current) {
        startSession();
      }
    };
    activityEvents.forEach(e => document.addEventListener(e, handleActivity, { passive: true }));

    // Visibility change (minimize, tab switch)
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        endSession();
      } else if (document.visibilityState === 'visible') {
        startSession();
        resetInactivityTimer();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    // Before unload (close tab/browser)
    const handleBeforeUnload = () => {
      endSession();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handleBeforeUnload);

    return () => {
      endSession();
      activityEvents.forEach(e => document.removeEventListener(e, handleActivity));
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handleBeforeUnload);
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    };
  }, [userId, startSession, endSession, resetInactivityTimer]);
}
