import { Redirect, Route } from "wouter";
import { Loader2 } from "lucide-react";

// This is a placeholder mock version for now.
// In a full app, this would use proper authentication.
interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
}

// Mock auth state for development - always authenticated
const useAuth = (): AuthState => {
  return {
    isAuthenticated: true,
    isLoading: false,
  };
};

interface ProtectedRouteProps {
  path: string;
  component: React.ComponentType;
}

export function ProtectedRoute({ path, component: Component }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <Route path={path}>
      {() => {
        if (isLoading) {
          return (
            <div className="flex items-center justify-center min-h-screen">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          );
        }

        if (!isAuthenticated) {
          return <Redirect to="/auth" />;
        }

        return <Component />;
      }}
    </Route>
  );
}