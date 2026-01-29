import { Outlet } from 'react-router-dom';
import { BottomNav } from '@/components/BottomNav';

export function AppLayout() {
  return (
    <div className="min-h-screen bg-background">
      <Outlet />
      <BottomNav />
    </div>
  );
}
