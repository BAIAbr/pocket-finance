import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface Mission {
  id: string;
  key: string;
  name: string;
  description: string;
  icon: string;
  xp_reward: number;
  category: string;
  medal_type: string;
  rarity: string;
  image_url?: string | null;
}

export interface CompletedMission {
  id: string;
  user_id: string;
  mission_id: string;
  xp_earned: number;
  completed_at: string;
  shown_home: boolean;
  shown_popup: boolean;
  mission?: Mission;
}

export interface WeeklyMission {
  id: string;
  user_id: string;
  title: string;
  description: string;
  icon: string;
  xp_reward: number;
  rarity: string;
  target_type: string;
  target_value: number;
  current_value: number;
  is_completed: boolean;
  week_start: string;
  expires_at: string;
}

export interface UserXP {
  total_xp: number;
  level: number;
}

export const RARITY_CONFIG: Record<string, { label: string; color: string; glow: string; border: string; bg: string; emoji: string; emojiColor: string }> = {
  common: { label: 'Comum', color: 'from-slate-500 to-slate-400', glow: 'shadow-slate-400/30', border: 'border-slate-400/30', bg: 'bg-slate-100 dark:bg-slate-800', emoji: '★', emojiColor: 'text-slate-400' },
  rare: { label: 'Raro', color: 'from-blue-500 to-cyan-400', glow: 'shadow-blue-400/40', border: 'border-blue-400/30', bg: 'bg-blue-50 dark:bg-blue-950', emoji: '★', emojiColor: 'text-blue-500' },
  epic: { label: 'Épico', color: 'from-purple-600 to-pink-400', glow: 'shadow-purple-400/50', border: 'border-purple-400/30', bg: 'bg-purple-50 dark:bg-purple-950', emoji: '★', emojiColor: 'text-purple-500' },
  legendary: { label: 'Lendário', color: 'from-yellow-400 via-orange-500 to-red-500', glow: 'shadow-yellow-400/60', border: 'border-yellow-400/40', bg: 'bg-yellow-50 dark:bg-yellow-950', emoji: '★', emojiColor: 'text-yellow-500' },
};

const XP_PER_LEVEL = 200;

function calculateLevel(xp: number): number {
  return Math.floor(xp / XP_PER_LEVEL) + 1;
}

export function useMissions() {
  const { user } = useAuth();
  const [missions, setMissions] = useState<Mission[]>([]);
  const [completedMissions, setCompletedMissions] = useState<CompletedMission[]>([]);
  const [weeklyMissions, setWeeklyMissions] = useState<WeeklyMission[]>([]);
  const [userXP, setUserXP] = useState<UserXP>({ total_xp: 0, level: 1 });
  const [pendingCelebration, setPendingCelebration] = useState<CompletedMission | null>(null);
  const [recentCompletions, setRecentCompletions] = useState<CompletedMission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingWeekly, setIsLoadingWeekly] = useState(false);

  const userId = user?.id ?? null;

  const loadData = useCallback(async () => {
    if (!userId) { setIsLoading(false); return; }

    try {
      const [missionsRes, historyRes, xpRes, weeklyRes] = await Promise.all([
        supabase.from('missions').select('*'),
        supabase.from('user_mission_history').select('*').eq('user_id', userId),
        supabase.from('user_xp').select('*').eq('user_id', userId).maybeSingle(),
        supabase.from('weekly_missions').select('*').eq('user_id', userId)
          .order('week_start', { ascending: false })
          .limit(20),
      ]);

      if (missionsRes.data) setMissions(missionsRes.data as unknown as Mission[]);
      if (historyRes.data) setCompletedMissions(historyRes.data as unknown as CompletedMission[]);
      if (weeklyRes.data && weeklyRes.data.length > 0) {
        // Show the latest week's missions (even if expired/completed)
        const latestWeekStart = (weeklyRes.data as any[])[0].week_start;
        const latestWeekMissions = (weeklyRes.data as any[]).filter(m => m.week_start === latestWeekStart);
        setWeeklyMissions(latestWeekMissions as unknown as WeeklyMission[]);
      }
      if (xpRes.data) {
        setUserXP(xpRes.data as unknown as UserXP);
      } else {
        await supabase.from('user_xp').insert({ user_id: userId, total_xp: 0, level: 1 });
      }

      if (historyRes.data) {
        const unshownPopup = (historyRes.data as unknown as CompletedMission[]).find(m => !m.shown_popup);
        if (unshownPopup && missionsRes.data) {
          const mission = (missionsRes.data as unknown as Mission[]).find(m => m.id === unshownPopup.mission_id);
          if (mission) setPendingCelebration({ ...unshownPopup, mission });
        }

        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const recent = (historyRes.data as unknown as CompletedMission[])
          .filter(m => !m.shown_home && m.completed_at > oneDayAgo)
          .map(m => ({ ...m, mission: (missionsRes.data as unknown as Mission[]).find(mi => mi.id === m.mission_id) }));
        setRecentCompletions(recent);
      }
    } catch (error) {
      console.error('Error loading missions:', error);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => { loadData(); }, [loadData]);

  const isMissionCompleted = useCallback((missionKey: string) => {
    const mission = missions.find(m => m.key === missionKey);
    if (!mission) return false;
    return completedMissions.some(cm => cm.mission_id === mission.id);
  }, [missions, completedMissions]);

  const completeMission = useCallback(async (missionKey: string) => {
    if (!userId) return;
    if (isMissionCompleted(missionKey)) return;

    const mission = missions.find(m => m.key === missionKey);
    if (!mission) return;

    try {
      const { data: historyData } = await supabase.from('user_mission_history').insert({
        user_id: userId, mission_id: mission.id, xp_earned: mission.xp_reward,
        shown_home: false, shown_popup: false,
      }).select().single();

      const newTotalXP = userXP.total_xp + mission.xp_reward;
      const newLevel = calculateLevel(newTotalXP);
      await supabase.from('user_xp').update({ total_xp: newTotalXP, level: newLevel }).eq('user_id', userId);

      await supabase.from('user_gamification_notifications').insert({
        user_id: userId, type: 'mission_complete',
        title: `Missão Concluída: ${mission.name}`, description: mission.description, icon: mission.icon,
      });

      setUserXP({ total_xp: newTotalXP, level: newLevel });

      if (historyData) {
        const completed = { ...(historyData as unknown as CompletedMission), mission };
        setCompletedMissions(prev => [...prev, completed]);
        setPendingCelebration(completed);
        setRecentCompletions(prev => [...prev, completed]);
      }
    } catch (error) {
      console.error('Error completing mission:', error);
    }
  }, [userId, missions, completedMissions, userXP, isMissionCompleted]);

  const dismissCelebration = useCallback(async () => {
    if (!pendingCelebration) return;
    await supabase.from('user_mission_history').update({ shown_popup: true }).eq('id', pendingCelebration.id);
    setPendingCelebration(null);
  }, [pendingCelebration]);

  const markHomeShown = useCallback(async (completionId: string) => {
    await supabase.from('user_mission_history').update({ shown_home: true }).eq('id', completionId);
    setRecentCompletions(prev => prev.filter(m => m.id !== completionId));
  }, []);

  const generateWeeklyMissions = useCallback(async () => {
    if (!userId) return;
    setIsLoadingWeekly(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-weekly-missions');
      if (error) throw error;
      if (data?.missions) setWeeklyMissions(data.missions as WeeklyMission[]);
    } catch (error) {
      console.error('Error generating weekly missions:', error);
    } finally {
      setIsLoadingWeekly(false);
    }
  }, [userId]);

  const updateWeeklyProgress = useCallback(async (missionId: string, newValue: number) => {
    const mission = weeklyMissions.find(m => m.id === missionId);
    if (!mission || mission.is_completed) return;

    const isCompleted = newValue >= mission.target_value;
    await supabase.from('weekly_missions').update({
      current_value: newValue, is_completed: isCompleted,
    }).eq('id', missionId);

    if (isCompleted && userId) {
      const newTotalXP = userXP.total_xp + mission.xp_reward;
      const newLevel = calculateLevel(newTotalXP);
      await supabase.from('user_xp').update({ total_xp: newTotalXP, level: newLevel }).eq('user_id', userId);
      setUserXP({ total_xp: newTotalXP, level: newLevel });

      await supabase.from('user_gamification_notifications').insert({
        user_id: userId, type: 'mission_complete',
        title: `Missão Semanal: ${mission.title}`, description: mission.description, icon: mission.icon,
      });
    }

    setWeeklyMissions(prev => prev.map(m => m.id === missionId ? { ...m, current_value: newValue, is_completed: isCompleted } : m));
  }, [weeklyMissions, userId, userXP]);

  const checkMissions = useCallback(async (context: {
    transactionCount?: number; incomeCount?: number; expenseCount?: number;
    streak?: number; savingsGoalCount?: number; completedGoalCount?: number;
    piggyBankCount?: number; monthlyBalance?: number;
  }) => {
    if (!userId || missions.length === 0) return;

    const checks: [string, boolean][] = [
      ['first_transaction', (context.transactionCount ?? 0) >= 1],
      ['first_income', (context.incomeCount ?? 0) >= 1],
      ['first_expense', (context.expenseCount ?? 0) >= 1],
      ['streak_3', (context.streak ?? 0) >= 3],
      ['streak_7', (context.streak ?? 0) >= 7],
      ['streak_14', (context.streak ?? 0) >= 14],
      ['streak_30', (context.streak ?? 0) >= 30],
      ['streak_60', (context.streak ?? 0) >= 60],
      ['ten_transactions', (context.transactionCount ?? 0) >= 10],
      ['twenty_five_transactions', (context.transactionCount ?? 0) >= 25],
      ['fifty_transactions', (context.transactionCount ?? 0) >= 50],
      ['hundred_transactions', (context.transactionCount ?? 0) >= 100],
      ['first_saving_goal', (context.savingsGoalCount ?? 0) >= 1],
      ['five_saving_goals', (context.savingsGoalCount ?? 0) >= 5],
      ['saving_goal_complete', (context.completedGoalCount ?? 0) >= 1],
      ['three_completed_goals', (context.completedGoalCount ?? 0) >= 3],
      ['first_piggy_bank', (context.piggyBankCount ?? 0) >= 1],
      ['five_piggy_banks', (context.piggyBankCount ?? 0) >= 5],
      ['budget_master', (context.monthlyBalance ?? 0) > 0],
    ];

    // Also update weekly mission progress
    for (const wm of weeklyMissions) {
      if (wm.is_completed) continue;
      let val = 0;
      switch (wm.target_type) {
        case 'transactions': val = context.transactionCount ?? 0; break;
        case 'income': val = context.incomeCount ?? 0; break;
        case 'expense': val = context.expenseCount ?? 0; break;
        case 'streak': val = context.streak ?? 0; break;
        case 'savings': val = context.savingsGoalCount ?? 0; break;
      }
      if (val > wm.current_value) {
        await updateWeeklyProgress(wm.id, val);
      }
    }

    for (const [key, condition] of checks) {
      if (condition && !isMissionCompleted(key)) {
        await completeMission(key);
        break;
      }
    }
  }, [userId, missions, isMissionCompleted, completeMission, weeklyMissions, updateWeeklyProgress]);

  return {
    missions, completedMissions, weeklyMissions, userXP, pendingCelebration,
    recentCompletions, isLoading, isLoadingWeekly,
    checkMissions, dismissCelebration, markHomeShown, isMissionCompleted,
    completeMission, generateWeeklyMissions, updateWeeklyProgress,
    refreshMissions: loadData,
  };
}
