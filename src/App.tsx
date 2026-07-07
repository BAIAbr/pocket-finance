import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route } from "react-router-dom";
import { FinanceProvider } from "@/contexts/FinanceContext";
import { MissionProvider } from "@/contexts/MissionContext";
import { FamilyProvider } from "@/contexts/FamilyContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AppearanceProvider } from "@/contexts/AppearanceContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/AppLayout";
import Dashboard from "./pages/Dashboard";
import Reports from "./pages/Reports";
import AIInsights from "./pages/AIInsights";
import Categories from "./pages/Categories";
import Savings from "./pages/Savings";
import SettingsPage from "./pages/Settings";
import AuthPage from "./pages/Auth";
import ResetPasswordPage from "./pages/ResetPassword";
import RedefinirSenhaPage from "./pages/RedefinirSenha";
import AdminDashboard from "./pages/AdminDashboard";
import FinancialHistory from "./pages/FinancialHistory";
import Achievements from "./pages/Achievements";
import Recurring from "./pages/Recurring";
import CalendarPage from "./pages/Calendar";
import Installments from "./pages/Installments";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <ThemeProvider>
        <AppearanceProvider>
        <AuthProvider>
          <FinanceProvider>
            <MissionProvider>
            <FamilyProvider>
            <Toaster />
            <Sonner />
            <HashRouter>
              <Routes>
                <Route path="/auth" element={<AuthPage />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />
                <Route path="/redefinir-senha" element={<RedefinirSenhaPage />} />
                <Route element={<AppLayout />}>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/reports" element={<Reports />} />
                  <Route path="/ai-insights" element={<AIInsights />} />
                  <Route path="/categories" element={<Categories />} />
                  <Route path="/savings" element={<Savings />} />
                  <Route path="/settings" element={<SettingsPage />} />
                  <Route path="/history" element={<FinancialHistory />} />
                  <Route path="/achievements" element={<Achievements />} />
                  <Route path="/recurring" element={<Recurring />} />
                  <Route path="/calendar" element={<CalendarPage />} />
                  <Route path="/admin" element={<AdminDashboard />} />
                </Route>
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </HashRouter>
            </FamilyProvider>
            </MissionProvider>
          </FinanceProvider>
        </AuthProvider>
        </AppearanceProvider>
      </ThemeProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
