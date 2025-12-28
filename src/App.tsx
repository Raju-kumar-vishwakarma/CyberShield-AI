import { Toaster } from "./components/ui/toaster";
import { TooltipProvider } from "./components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "./components/ThemeProvider";
import { ProtectedRoute } from "./components/ProtectedRoute";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import PhishingDetection from "./pages/PhishingDetection";
import ThreatMonitoring from "./pages/ThreatMonitoring";
import SecureChat from "./pages/SecureChat";
import SecurityTools from "./pages/SecurityTools";
import ActivityLogs from "./pages/ActivityLogs";
import EmailBreachChecker from "./pages/EmailBreachChecker";
import SSLChecker from "./pages/SSLChecker";
import SecurityScore from "./pages/SecurityScore";
import Profile from "./pages/Profile";
import WebScanner from "./pages/WebScanner";
import NetworkDevices from "./pages/NetworkDevices";
import AIDetection from "./pages/AIDetection";
import DNSChecker from "./pages/DNSChecker";
import DarkWebMonitor from "./pages/DarkWebMonitor";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <ThemeProvider defaultTheme="dark" storageKey="cybershield-theme">
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            
            {/* Protected routes */}
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/phishing" element={<ProtectedRoute><PhishingDetection /></ProtectedRoute>} />
            <Route path="/ai-detection" element={<ProtectedRoute><AIDetection /></ProtectedRoute>} />
            <Route path="/threats" element={<ProtectedRoute><ThreatMonitoring /></ProtectedRoute>} />
            <Route path="/secure-chat" element={<ProtectedRoute><SecureChat /></ProtectedRoute>} />
            <Route path="/security-tools" element={<ProtectedRoute><SecurityTools /></ProtectedRoute>} />
            <Route path="/activity-logs" element={<ProtectedRoute><ActivityLogs /></ProtectedRoute>} />
            <Route path="/email-breach" element={<ProtectedRoute><EmailBreachChecker /></ProtectedRoute>} />
            <Route path="/ssl-checker" element={<ProtectedRoute><SSLChecker /></ProtectedRoute>} />
            <Route path="/security-score" element={<ProtectedRoute><SecurityScore /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/web-scanner" element={<ProtectedRoute><WebScanner /></ProtectedRoute>} />
            <Route path="/network" element={<ProtectedRoute><NetworkDevices /></ProtectedRoute>} />
            <Route path="/dns-checker" element={<ProtectedRoute><DNSChecker /></ProtectedRoute>} />
            <Route path="/dark-web" element={<ProtectedRoute><DarkWebMonitor /></ProtectedRoute>} />
            
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
