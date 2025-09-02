import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Web3Provider } from "@/components/Web3Provider";
import NotFound from "@/pages/not-found";
import Auditor from "@/pages/auditor";
import AuthPage from "@/pages/auth";
import Landing from "@/pages/landing";
import Community from "@/pages/community";
import AuditHistoryPage from "@/pages/audit-history";
import IntegrationsPage from "@/pages/integrations";
import SettingsPage from "@/pages/settings";
import MCPInfoPage from "@/pages/mcp-info";
import { useWeb3Auth } from "@/hooks/useWeb3Auth";
import { useState, useEffect } from "react";

// Loading screen component
function LoadingScreen() {
  return (
    <div className="app-loading">
      <div className="loading-content">
        <div className="loading-spinner"></div>
        <div className="loading-title">SmartAudit AI</div>
        <div className="loading-subtitle">Initializing secure audit environment...</div>
      </div>
    </div>
  );
}

function Router() {
  const { isAuthenticated, user, isAuthenticating } = useWeb3Auth();
  const [appLoading, setAppLoading] = useState(true);

  // Show loading screen for initial app load
  useEffect(() => {
    // Only set loading to false after authentication state is determined
    if (!isAuthenticating) {
      const timer = setTimeout(() => {
        setAppLoading(false);
      }, 500); // Reduced timing for faster loading
      return () => clearTimeout(timer);
    }
  }, [isAuthenticating]);

  // Show loading screen during authentication check or initial app load
  if (appLoading || isAuthenticating) {
    return <LoadingScreen />;
  }

  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />
      <Route path="/auditor">
        {isAuthenticated && user ? <Auditor /> : <AuthPage />}
      </Route>
      <Route path="/history">
        {isAuthenticated && user ? <AuditHistoryPage /> : <AuthPage />}
      </Route>
      <Route path="/community" component={Community} />
      <Route path="/integrations">
        {isAuthenticated && user ? <IntegrationsPage /> : <AuthPage />}
      </Route>
      <Route path="/settings">
        {isAuthenticated && user ? <SettingsPage /> : <AuthPage />}
      </Route>
      <Route path="/mcp-info" component={MCPInfoPage} />
      <Route path="/" component={Landing} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Web3Provider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </Web3Provider>
    </QueryClientProvider>
  );
}

export default App;
