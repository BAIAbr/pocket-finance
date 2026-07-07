import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route } from "react-router-dom";
import { FinanceProvider } from "@/contexts/FinanceContext";

import { FamilyProvider } from "@/contexts/FamilyContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AppearanceProvider } from "@/contexts/AppearanceContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/AppLayout";
import { PlanGate } from "@/components/PlanGate";
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

import Recurring from "./pages/Recurring";

import Installments from "./pages/Installments";
import Plans from "./pages/Plans";
import Security from "./pages/Security";
import NotFound from "./pages/NotFound";
import VipRedeem from "./pages/VipRedeem";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <ThemeProvider>
        <AppearanceProvider>
        <AuthProvider>
          <FinanceProvider>
            <FamilyProvider>
            <Toaster />
            <Sonner />
            <HashRouter>
              <Routes>
                <Route path="/auth" element={<AuthPage />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />
                <Route path="/redefinir-senha" element={<RedefinirSenhaPage />} />
                <Route path="/vip/:code" element={<VipRedeem />} />
                <Route element={<AppLayout />}>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/reports" element={<Reports />} />
                  <Route path="/ai-insights" element={<PlanGate feature="ai"><AIInsights /></PlanGate>} />
                  <Route path="/categories" element={<Categories />} />
                  <Route path="/savings" element={<Savings />} />
                  <Route path="/settings" element={<SettingsPage />} />
                  <Route path="/history" element={<FinancialHistory />} />
                  <Route path="/recurring" element={<PlanGate feature="recurring"><Recurring /></PlanGate>} />
                  
                  <Route path="/installments" element={<PlanGate feature="installments"><Installments /></PlanGate>} />
                  <Route path="/plans" element={<Plans />} />
                  <Route path="/security" element={<Security />} />
                  <Route path="/admin" element={<AdminDashboard />} />
                </Route>
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </HashRouter>
            </FamilyProvider>
          </FinanceProvider>
        </AuthProvider>
        </AppearanceProvider>
      </ThemeProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
