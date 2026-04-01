import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { ViewAsProvider } from "@/hooks/useViewAs";
import ProtectedRoute from "@/components/ProtectedRoute";
import AdminRoute from "@/components/AdminRoute";
import Index from "./pages/Index.tsx";
import Leads from "./pages/Leads.tsx";
import Pipeline from "./pages/Pipeline.tsx";
import Followups from "./pages/Followups.tsx";
import Quotes from "./pages/Quotes.tsx";
import Auth from "./pages/Auth.tsx";
import ForgotPassword from "./pages/ForgotPassword.tsx";
import ResetPassword from "./pages/ResetPassword.tsx";
import NotFound from "./pages/NotFound.tsx";
import Install from "./pages/Install.tsx";
import Schedule from "./pages/Schedule.tsx";
import Settings from "./pages/Settings.tsx";
import Projects from "./pages/Projects.tsx";
import Profitability from "./pages/Profitability.tsx";
import Team from "./pages/Team.tsx";
import Inventory from "./pages/Inventory.tsx";
import Tasks from "./pages/Tasks.tsx";
import Activity from "./pages/Activity.tsx";
import Documents from "./pages/Documents.tsx";
import Clients from "./pages/Clients.tsx";
import ClientDetail from "./pages/ClientDetail.tsx";
import Timesheets from "./pages/Timesheets.tsx";
import WorkOrder from "./pages/WorkOrder.tsx";
import Punch from "./pages/Punch.tsx";
import ColorVisualizer from "./pages/ColorVisualizer.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <ViewAsProvider>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
            <Route path="/leads" element={<ProtectedRoute><AdminRoute><Leads /></AdminRoute></ProtectedRoute>} />
            <Route path="/pipeline" element={<ProtectedRoute><AdminRoute><Pipeline /></AdminRoute></ProtectedRoute>} />
            <Route path="/followups" element={<ProtectedRoute><AdminRoute><Followups /></AdminRoute></ProtectedRoute>} />
            <Route path="/quotes" element={<ProtectedRoute><AdminRoute><Quotes /></AdminRoute></ProtectedRoute>} />
            <Route path="/schedule" element={<ProtectedRoute><Schedule /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><AdminRoute adminOnly><Settings /></AdminRoute></ProtectedRoute>} />
            <Route path="/projects" element={<ProtectedRoute><Projects /></ProtectedRoute>} />
            <Route path="/profitability" element={<ProtectedRoute><AdminRoute><Profitability /></AdminRoute></ProtectedRoute>} />
            <Route path="/team" element={<ProtectedRoute><Team /></ProtectedRoute>} />
            <Route path="/inventory" element={<ProtectedRoute><Inventory /></ProtectedRoute>} />
            <Route path="/tasks" element={<ProtectedRoute><Tasks /></ProtectedRoute>} />
            <Route path="/activity" element={<ProtectedRoute><AdminRoute><Activity /></AdminRoute></ProtectedRoute>} />
            <Route path="/documents" element={<ProtectedRoute><Documents /></ProtectedRoute>} />
            <Route path="/clients" element={<ProtectedRoute><AdminRoute><Clients /></AdminRoute></ProtectedRoute>} />
            <Route path="/clients/:id" element={<ProtectedRoute><AdminRoute><ClientDetail /></AdminRoute></ProtectedRoute>} />
            <Route path="/timesheets" element={<ProtectedRoute><Timesheets /></ProtectedRoute>} />
            <Route path="/work-order" element={<ProtectedRoute><WorkOrder /></ProtectedRoute>} />
            <Route path="/punch" element={<ProtectedRoute><Punch /></ProtectedRoute>} />
            <Route path="/visualizer" element={<ProtectedRoute><ColorVisualizer /></ProtectedRoute>} />
            <Route path="/install" element={<Install />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          </ViewAsProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
