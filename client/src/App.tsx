import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import DashboardPage from "@/pages/DashboardPage";
import AuthPage from "@/pages/auth-page";
import LandingPage from "@/pages/landing-page";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/lib/protected-route";
import { ThemeProvider } from "@/components/ui/theme-provider";

function Router() {
  return (
    <Switch>
      <Route path="/" component={LandingPage} />
      <ProtectedRoute path="/home" component={Home} />
      <ProtectedRoute path="/dashboard" component={DashboardPage} />
      <Route path="/auth" component={AuthPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light" storageKey="app-theme">
        <AuthProvider>
          <div className="min-h-screen bg-background text-foreground antialiased">
            <Router />
            <Toaster />
          </div>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;