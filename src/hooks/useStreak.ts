import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { format, subDays, differenceInCalendarDays, parseISO } from 'date-fns';

interface StreakData {
  currentStreak: number;
  lastActivityDate: string | null;
  hasRegisteredToday: boolean;
  isLoading: boolean;
}

export function useStreak(userId: string | null) {
  const [streakData, setStreakData] = useState<StreakData>({
    currentStreak: 0,
    lastActivityDate: null,
    hasRegisteredToday: false,
    isLoading: true,
  });

  const today = format(new Date(), 'yyyy-MM-dd');

  const loadStreak = useCallback(async () => {
    if (!userId) {
      setStreakData({ currentStreak: 0, lastActivityDate: null, hasRegisteredToday: false, isLoading: false });
      return;
    }

    try {
      const { data: analytics } = await supabase
        .from('user_analytics')
        .select('current_streak, last_activity_date, missed_days_in_week, week_cycle_start')
        .eq('user_id', userId)
        .maybeSingle();

      if (!analytics) {
        setStreakData({ currentStreak: 0, lastActivityDate: null, hasRegisteredToday: false, isLoading: false });
        return;
      }

      const lastActivity = analytics.last_activity_date as string | null;
      const hasRegisteredToday = lastActivity === today;

      setStreakData({
        currentStreak: analytics.current_streak as number ?? 0,
        lastActivityDate: lastActivity,
        hasRegisteredToday,
        isLoading: false,
      });
    } catch (error) {
      console.error('Error loading streak:', error);
      setStreakData(prev => ({ ...prev, isLoading: false }));
    }
  }, [userId, today]);

  useEffect(() => {
    loadStreak();
  }, [loadStreak]);

  const updateStreak = useCallback(async () => {
    if (!userId) return;

    try {
      const { data: analytics } = await supabase
        .from('user_analytics')
        .select('current_streak, last_activity_date, missed_days_in_week, week_cycle_start')
        .eq('user_id', userId)
        .maybeSingle();

      if (!analytics) return;

      const lastActivity = analytics.last_activity_date as string | null;
      const currentStreak = analytics.current_streak as number ?? 0;
      const missedDays = analytics.missed_days_in_week as number ?? 0;
      const weekStart = analytics.week_cycle_start as string | null;

      // Already registered today
      if (lastActivity === today) return;

      let newStreak = 1;
      let newMissedDays = missedDays;
      let newWeekStart = weekStart;

      // Reset week cycle if 7 days passed
      if (weekStart) {
        const daysSinceWeekStart = differenceInCalendarDays(new Date(), parseISO(weekStart));
        if (daysSinceWeekStart >= 7) {
          newMissedDays = 0;
          newWeekStart = today;
        }
      } else {
        newWeekStart = today;
      }

      if (lastActivity) {
        const daysSinceLastActivity = differenceInCalendarDays(new Date(), parseISO(lastActivity));

        if (daysSinceLastActivity === 1) {
          // Registered yesterday → increment
          newStreak = currentStreak + 1;
        } else if (daysSinceLastActivity === 2) {
          // Missed 1 day
          newMissedDays += 1;
          if (newMissedDays <= 1) {
            // Grace: keep streak
            newStreak = currentStreak + 1;
          } else {
            // Too many misses → reset
            newStreak = 1;
            newMissedDays = 0;
            newWeekStart = today;
          }
        } else {
          // Missed 2+ consecutive days → reset
          newStreak = 1;
          newMissedDays = 0;
          newWeekStart = today;
        }
      }

      await supabase
        .from('user_analytics')
        .update({
          current_streak: newStreak,
          last_activity_date: today,
          missed_days_in_week: newMissedDays,
          week_cycle_start: newWeekStart,
        })
        .eq('user_id', userId);

      setStreakData({
        currentStreak: newStreak,
        lastActivityDate: today,
        hasRegisteredToday: true,
        isLoading: false,
      });
    } catch (error) {
      console.error('Error updating streak:', error);
    }
  }, [userId, today]);

  return { ...streakData, updateStreak, refreshStreak: loadStreak };
}
