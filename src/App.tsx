import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { LocationProvider } from "@/contexts/LocationContext";
import Dashboard from "@/pages/Dashboard";
import InstancesPage from "@/pages/InstancesPage";
import GHLIntegrationPage from "@/pages/GHLIntegrationPage";
import LogsPage from "@/pages/LogsPage";
import SettingsPage from "@/pages/SettingsPage";
import ManagerPage from "@/pages/ManagerPage";
import InstanceDashboard from "@/pages/InstanceDashboard";
import GHLCallback from "@/pages/GHLCallback";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <BrowserRouter>
        <Toaster />
        <Sonner />
        <Routes>
          <Route path="/" element={<ManagerPage />} />
          <Route path="/ghl-callback" element={<GHLCallback />} />
          
          <Route 
            path="/:locationId" 
            element={
              <LocationProvider>
                <Dashboard />
              </LocationProvider>
            }
          >
            <Route index element={<InstancesPage />} />
            <Route path="instances" element={<InstancesPage />} />
            <Route path="dashboard" element={<InstanceDashboard />} />
            <Route path="ghl" element={<GHLIntegrationPage />} />
            <Route path="logs" element={<LogsPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;