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
import { useWeb3Auth } from "@/hooks/useWeb3Auth";
import { useState, useEffect } from "react";
import { ErrorBoundary } from "@/components/ErrorBoundary";

// Set document title and meta information on route changes
function useDocumentTitle(title: string, description?: string) {
  useEffect(() => {
    document.title = title;
    
    if (description) {
      let metaDescription = document.querySelector('meta[name="description"]');
      if (!metaDescription) {
        metaDescription = document.createElement('meta');
        metaDescription.setAttribute('name', 'description');
        document.head.appendChild(metaDescription);
      }
      metaDescription.setAttribute('content', description);
    }
  }, [title, description]);
}

// Loading screen component
function LoadingScreen() {
  return (
    <div className="app-loading" role="status" aria-label="Loading application">
      <div className="loading-content">
        <div className="loading-spinner" aria-hidden="true"></div>
        <div className="loading-title">SmartAudit AI</div>
        <div className="loading-subtitle">Initializing secure audit environment...</div>
      </div>
      <span className="sr-only">Loading, please wait...</span>
    </div>
  );
}

function Router() {
  const { isAuthenticated, user, isAuthenticating } = useWeb3Auth();
  const [appLoading, setAppLoading] = useState(true);

  // Show loading screen for initial app load with smooth transition
  useEffect(() => {
    // Only set loading to false after authentication state is determined
    if (!isAuthenticating) {
      const timer = setTimeout(() => {
        setAppLoading(false);
      }, 800); // Optimal timing for smooth UX
      return () => clearTimeout(timer);
    }
  }, [isAuthenticating]);

  // Show loading screen during authentication check or initial app load
  if (appLoading || isAuthenticating) {
    return <LoadingScreen />;
  }

  return (
    <main className="page-transition" role="main">
      <Switch>
        <Route path="/auth" component={() => {
          useDocumentTitle("Sign In - SmartAudit AI", "Sign in to access professional smart contract auditing tools and security analysis features.");
          return <AuthPage />;
        }} />
        <Route path="/auditor" component={() => {
          useDocumentTitle("Smart Contract Auditor - SmartAudit AI", "Analyze smart contracts for security vulnerabilities with AI-powered auditing tools.");
          return isAuthenticated && user ? <Auditor /> : <AuthPage />;
        }} />
        <Route path="/history" component={() => {
          useDocumentTitle("Audit History - SmartAudit AI", "View your smart contract audit history and security analysis reports.");
          return isAuthenticated && user ? <AuditHistoryPage /> : <AuthPage />;
        }} />
        <Route path="/community" component={() => {
          useDocumentTitle("Community Audits - SmartAudit AI", "Explore public smart contract audits shared by the security community.");
          return <Community />;
        }} />
        <Route path="/integrations" component={() => {
          useDocumentTitle("Integrations - SmartAudit AI", "Connect GitHub and automate your smart contract security workflows.");
          return isAuthenticated && user ? <IntegrationsPage /> : <AuthPage />;
        }} />
        <Route path="/settings" component={() => {
          useDocumentTitle("Settings - SmartAudit AI", "Manage your account, credits, and security preferences.");
          return isAuthenticated && user ? <SettingsPage /> : <AuthPage />;
        }} />
        <Route path="/" component={() => {
          useDocumentTitle("SmartAudit AI - Advanced Smart Contract Security Analysis", "Professional AI-powered smart contract auditing platform. Detect vulnerabilities and ensure your Web3 contracts are production-ready.");
          return <Landing />;
        }} />
        <Route component={() => {
          useDocumentTitle("Page Not Found - SmartAudit AI");
          return <NotFound />;
        }} />
      </Switch>
    </main>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <Web3Provider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </Web3Provider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
