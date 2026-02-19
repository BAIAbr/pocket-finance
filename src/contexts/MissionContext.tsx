import React, { createContext, useContext, useEffect, useState } from 'react';
import { useMissions, CompletedMission, UserXP, Mission } from '@/hooks/useMissions';
import { useAuth } from '@/contexts/AuthContext';
import { MissionCelebrationModal } from '@/components/MissionCelebrationModal';
import { MissionDetailModal } from '@/components/MissionDetailModal';

interface MissionContextType {
  missions: Mission[];
  completedMissions: CompletedMission[];
  userXP: UserXP;
  recentCompletions: CompletedMission[];
  isLoading: boolean;
  checkMissions: (context: Record<string, number | undefined>) => Promise<void>;
  markHomeShown: (id: string) => Promise<void>;
  viewDetails: (completion: CompletedMission) => void;
  isMissionCompleted: (key: string) => boolean;
}

const MissionContext = createContext<MissionContextType | null>(null);

export function MissionProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
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
      userXP: missionData.userXP,
      recentCompletions: missionData.recentCompletions,
      isLoading: missionData.isLoading,
      checkMissions: missionData.checkMissions,
      markHomeShown: missionData.markHomeShown,
      viewDetails: handleViewDetails,
      isMissionCompleted: missionData.isMissionCompleted,
    }}>
      {children}

      {/* Global celebration modal */}
      <MissionCelebrationModal
        completion={missionData.pendingCelebration}
        onDismiss={missionData.dismissCelebration}
        onViewDetails={handleViewDetails}
      />

      {/* Detail modal */}
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
  if (!context) {
    throw new Error('useMissionContext must be used within a MissionProvider');
  }
  return context;
}
