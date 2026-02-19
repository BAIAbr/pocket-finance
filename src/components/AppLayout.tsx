import { Outlet, Navigate } from 'react-router-dom';
import { BottomNav } from '@/components/BottomNav';
import { DesktopSidebar } from '@/components/DesktopSidebar';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import { useSessionTracker } from '@/hooks/useSessionTracker';

export function AppLayout() {
  const { isAuthenticated, isLoading, user } = useAuth();

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
