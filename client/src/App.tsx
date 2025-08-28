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
import { useWeb3Auth } from "@/hooks/useWeb3Auth";

function Router() {
  const { isAuthenticated, user } = useWeb3Auth();

  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />
      <Route path="/app">
        {isAuthenticated && user ? <Auditor /> : <AuthPage />}
      </Route>
      <Route path="/community" component={Community} />
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
