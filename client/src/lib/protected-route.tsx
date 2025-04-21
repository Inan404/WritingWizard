import { useAuth } from '@/hooks/use-auth';
import { Loader2 } from 'lucide-react';
import { Redirect, Route, RouteComponentProps } from 'wouter';

interface ProtectedRouteProps {
  path: string;
  component: React.ComponentType;
}

// This wrapper ensures the component gets the route props it needs
const RouteWrapper = ({ component: Component }: { component: React.ComponentType<any> }) => {
  return <Component />;
};

export function ProtectedRoute({ path, component }: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <Route path={path}>
        {() => (
          <div className="flex items-center justify-center min-h-screen">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}
      </Route>
    );
  }

  if (!user) {
    return (
      <Route path={path}>
        {() => <Redirect to="/auth" />}
      </Route>
    );
  }

  return (
    <Route path={path}>
      {() => <RouteWrapper component={component} />}
    </Route>
  );
}