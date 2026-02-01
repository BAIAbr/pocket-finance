import { Outlet } from 'react-router-dom';
import { BottomNav } from '@/components/BottomNav';

export function AppLayout() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex-1">
        <Outlet />
      </div>
      <footer className="text-center text-xs text-muted-foreground py-4 pb-24">
        © {new Date().getFullYear()} Todos os direitos reservados FINANGO
      </footer>
      <BottomNav />
    </div>
  );
}
