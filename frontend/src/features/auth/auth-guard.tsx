// Route guard: wraps the protected routes. Renders nothing while auth is still
// resolving, redirects to /login when anonymous, and hands control to the
// matched child route (via <Outlet />) once authenticated.
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './auth-context';

export function RequireAuth() {
  const { state } = useAuth();

  switch (state.status) {
    case 'loading':
      return null;
    case 'anonymous':
      return <Navigate to="/login" replace />;
    case 'authenticated':
      return <Outlet />;
  }
}
