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

export interface UserXP {
  total_xp: number;
  level: number;
}

const XP_PER_LEVEL = 200;

function calculateLevel(xp: number): number {
  return Math.floor(xp / XP_PER_LEVEL) + 1;
}

export function useMissions() {
  const { user } = useAuth();
  const [missions, setMissions] = useState<Mission[]>([]);
  const [completedMissions, setCompletedMissions] = useState<CompletedMission[]>([]);
  const [userXP, setUserXP] = useState<UserXP>({ total_xp: 0, level: 1 });
  const [pendingCelebration, setPendingCelebration] = useState<CompletedMission | null>(null);
  const [recentCompletions, setRecentCompletions] = useState<CompletedMission[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const userId = user?.id ?? null;

  // Load all data
  const loadData = useCallback(async () => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    try {
      const [missionsRes, historyRes, xpRes] = await Promise.all([
        supabase.from('missions').select('*'),
        supabase.from('user_mission_history').select('*').eq('user_id', userId),
        supabase.from('user_xp').select('*').eq('user_id', userId).maybeSingle(),
      ]);

      if (missionsRes.data) setMissions(missionsRes.data as unknown as Mission[]);
      if (historyRes.data) setCompletedMissions(historyRes.data as unknown as CompletedMission[]);
      if (xpRes.data) {
        setUserXP(xpRes.data as unknown as UserXP);
      } else {
        // Create XP record
        await supabase.from('user_xp').insert({ user_id: userId, total_xp: 0, level: 1 });
      }

      // Find unshown popup
      if (historyRes.data) {
        const unshownPopup = (historyRes.data as unknown as CompletedMission[]).find(m => !m.shown_popup);
        if (unshownPopup && missionsRes.data) {
          const mission = (missionsRes.data as unknown as Mission[]).find(m => m.id === unshownPopup.mission_id);
          if (mission) {
            setPendingCelebration({ ...unshownPopup, mission });
          }
        }

        // Recent completions (last 24h, not shown on home)
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const recent = (historyRes.data as unknown as CompletedMission[])
          .filter(m => !m.shown_home && m.completed_at > oneDayAgo)
          .map(m => ({
            ...m,
            mission: (missionsRes.data as unknown as Mission[]).find(mi => mi.id === m.mission_id),
          }));
        setRecentCompletions(recent);
      }
    } catch (error) {
      console.error('Error loading missions:', error);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

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
      // Insert completion
      const { data: historyData } = await supabase.from('user_mission_history').insert({
        user_id: userId,
        mission_id: mission.id,
        xp_earned: mission.xp_reward,
        shown_home: false,
        shown_popup: false,
      }).select().single();

      // Update XP
      const newTotalXP = userXP.total_xp + mission.xp_reward;
      const newLevel = calculateLevel(newTotalXP);
      await supabase.from('user_xp').update({
        total_xp: newTotalXP,
        level: newLevel,
      }).eq('user_id', userId);

      // Create notification
      await supabase.from('user_gamification_notifications').insert({
        user_id: userId,
        type: 'mission_complete',
        title: `Missão Concluída: ${mission.name}`,
        description: mission.description,
        icon: mission.icon,
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
    await supabase.from('user_mission_history')
      .update({ shown_popup: true })
      .eq('id', pendingCelebration.id);
    setPendingCelebration(null);
  }, [pendingCelebration]);

  const markHomeShown = useCallback(async (completionId: string) => {
    await supabase.from('user_mission_history')
      .update({ shown_home: true })
      .eq('id', completionId);
    setRecentCompletions(prev => prev.filter(m => m.id !== completionId));
  }, []);

  // Check missions based on current state
  const checkMissions = useCallback(async (context: {
    transactionCount?: number;
    incomeCount?: number;
    expenseCount?: number;
    streak?: number;
    savingsGoalCount?: number;
    completedGoalCount?: number;
    piggyBankCount?: number;
    monthlyBalance?: number;
  }) => {
    if (!userId || missions.length === 0) return;

    const checks: [string, boolean][] = [
      ['first_transaction', (context.transactionCount ?? 0) >= 1],
      ['first_income', (context.incomeCount ?? 0) >= 1],
      ['first_expense', (context.expenseCount ?? 0) >= 1],
      ['streak_3', (context.streak ?? 0) >= 3],
      ['streak_7', (context.streak ?? 0) >= 7],
      ['streak_30', (context.streak ?? 0) >= 30],
      ['ten_transactions', (context.transactionCount ?? 0) >= 10],
      ['fifty_transactions', (context.transactionCount ?? 0) >= 50],
      ['first_saving_goal', (context.savingsGoalCount ?? 0) >= 1],
      ['saving_goal_complete', (context.completedGoalCount ?? 0) >= 1],
      ['first_piggy_bank', (context.piggyBankCount ?? 0) >= 1],
      ['budget_master', (context.monthlyBalance ?? 0) > 0],
    ];

    for (const [key, condition] of checks) {
      if (condition && !isMissionCompleted(key)) {
        await completeMission(key);
        break; // One at a time for celebration
      }
    }
  }, [userId, missions, isMissionCompleted, completeMission]);

  return {
    missions,
    completedMissions,
    userXP,
    pendingCelebration,
    recentCompletions,
    isLoading,
    checkMissions,
    dismissCelebration,
    markHomeShown,
    isMissionCompleted,
    completeMission,
    refreshMissions: loadData,
  };
}
