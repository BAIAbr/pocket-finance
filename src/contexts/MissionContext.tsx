import React, { createContext, useContext, useState } from 'react';
import { useMissions, CompletedMission, UserXP, Mission, WeeklyMission } from '@/hooks/useMissions';
import { MissionCelebrationModal } from '@/components/MissionCelebrationModal';
import { MissionDetailModal } from '@/components/MissionDetailModal';

interface MissionContextType {
  missions: Mission[];
  completedMissions: CompletedMission[];
  weeklyMissions: WeeklyMission[];
  userXP: UserXP;
  recentCompletions: CompletedMission[];
  isLoading: boolean;
  isLoadingWeekly: boolean;
  checkMissions: (context: Record<string, number | undefined>) => Promise<void>;
  markHomeShown: (id: string) => Promise<void>;
  viewDetails: (completion: CompletedMission) => void;
  isMissionCompleted: (key: string) => boolean;
  generateWeeklyMissions: () => Promise<void>;
}

const MissionContext = createContext<MissionContextType | null>(null);

export function MissionProvider({ children }: { children: React.ReactNode }) {
  const missionData = useMissions();
  const [detailCompletion, setDetailCompletion] = useState<CompletedMission | null>(null);

  const handleViewDetails = (completion: CompletedMission) => {
    missionData.dismissCelebration();
    setDetailCompletion(completion);
  };

  return (
    <MissionContext.Provider value={{
      missions: missionData.missions,
      completedMissions: missionData.completedMissions,
      weeklyMissions: missionData.weeklyMissions,
      userXP: missionData.userXP,
      recentCompletions: missionData.recentCompletions,
      isLoading: missionData.isLoading,
      isLoadingWeekly: missionData.isLoadingWeekly,
      checkMissions: missionData.checkMissions,
      markHomeShown: missionData.markHomeShown,
      viewDetails: handleViewDetails,
      isMissionCompleted: missionData.isMissionCompleted,
      generateWeeklyMissions: missionData.generateWeeklyMissions,
    }}>
      {children}

      <MissionCelebrationModal
        completion={missionData.pendingCelebration}
        onDismiss={missionData.dismissCelebration}
        onViewDetails={handleViewDetails}
      />

      <MissionDetailModal
        completion={detailCompletion}
        userXP={missionData.userXP}
        totalMissions={missionData.missions.length}
        completedCount={missionData.completedMissions.length}
        onClose={() => setDetailCompletion(null)}
      />
    </MissionContext.Provider>
  );
}

export function useMissionContext() {
  const context = useContext(MissionContext);
  if (!context) throw new Error('useMissionContext must be used within a MissionProvider');
  return context;
}
