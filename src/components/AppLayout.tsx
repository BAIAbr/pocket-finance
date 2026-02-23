import { Outlet, Navigate } from 'react-router-dom';
import { BottomNav } from '@/components/BottomNav';
import { DesktopSidebar } from '@/components/DesktopSidebar';
import { useAuth } from '@/contexts/AuthContext';
import { useFamilyContext } from '@/contexts/FamilyContext';
import { Loader2, Users, User } from 'lucide-react';
import { useSessionTracker } from '@/hooks/useSessionTracker';
import { cn } from '@/lib/utils';

export function AppLayout() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const { family, viewContext, setViewContext } = useFamilyContext();

  // Track user sessions
  useSessionTracker(user?.id);

  // Show loading while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Redirect to auth if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop Sidebar */}
      <DesktopSidebar />

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-h-screen overflow-x-hidden">
        {/* Family Context Switcher */}
        {family && (
          <div className="px-4 lg:px-8 pt-3 pb-0">
            <div className="flex items-center gap-1 p-1 bg-secondary/50 rounded-xl w-fit">
              <button
                onClick={() => setViewContext('personal')}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                  viewContext === 'personal'
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <User size={14} />
                Minha Conta
              </button>
              <button
                onClick={() => setViewContext('family')}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                  viewContext === 'family'
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Users size={14} />
                {family.nome}
              </button>
            </div>
          </div>
        )}
        <div className="flex-1">
          <Outlet />
        </div>
        <footer className="text-center text-xs text-muted-foreground py-4 pb-28 lg:pb-4">
          <span className="lg:hidden">Copyright © Finango – Todos os direitos reservados.</span>
        </footer>

        {/* Mobile Bottom Nav */}
        <div className="lg:hidden">
          <BottomNav />
        </div>
      </div>
    </div>
  );
}
