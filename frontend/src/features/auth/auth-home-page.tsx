// Protected `/` route: the placeholder landing page shown once logged in. It
// proves the round trip works: it reads the bootstrapped user off the context.
// The video library (HYP-13) takes its place.
import { Trans, useTranslation } from 'react-i18next';
import { useAuth } from './auth-context';

/**
 * Landing page behind {@link RequireAuth}: renders the current user's
 * identity. Logging out is in the app header.
 */
export function HomePage() {
  const { t } = useTranslation('auth');
  const { state } = useAuth();

  // RequireAuth only renders this component in the `authenticated` state, so
  // `state.user` is always set here - the `?.` is a type-level guard, not a
  // real runtime case.
  const user = state.user;

  return (
    <div className="mx-auto my-12 flex max-w-lg flex-col items-start gap-4">
      <h1>Hypertube</h1>
      {/* An email has no space to break at: let it wrap anywhere on a phone. */}
      <p className="wrap-anywhere">
        <Trans
          t={t}
          i18nKey="home.signedIn"
          values={{ username: user?.username, email: user?.email }}
          components={{ strong: <strong /> }}
        />
      </p>
    </div>
  );
}
