// Route guard: wraps the protected routes. Shows a loading message while auth
// is still resolving, redirects to /login when anonymous, and hands control to
// the matched child route (via <Outlet />) once authenticated.
import { Navigate, Outlet } from 'react-router-dom';
import { LoadingStatus } from '../../app/app-loading';
import { useAuth } from './auth-context';

/** Layout route that only lets authenticated users through to its children. */
export function RequireAuth() {
  const { state } = useAuth();

  switch (state.status) {
    case 'loading':
      return <LoadingStatus />;
    case 'anonymous':
      return <Navigate to="/login" replace />;
    case 'authenticated':
      return <Outlet />;
  }
}
