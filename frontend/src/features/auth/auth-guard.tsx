// Route guard: wraps the protected routes. Shows a loading message while auth
// is still resolving, redirects to /login when anonymous, and hands control to
// the matched child route (via <Outlet />) once authenticated.
import { Navigate, Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from './auth-context';

/** Layout route that only lets authenticated users through to its children. */
export function RequireAuth() {
  const { t } = useTranslation('common');
  const { state } = useAuth();

  switch (state.status) {
    case 'loading':
      // Shown only if the session check takes a while (`animate-appear-late`).
      return (
        <p
          role="status"
          className="my-12 text-center font-mono text-sm text-muted opacity-0 animate-appear-late"
        >
          {t('loading')}
        </p>
      );
    case 'anonymous':
      return <Navigate to="/login" replace />;
    case 'authenticated':
      return <Outlet />;
  }
}
