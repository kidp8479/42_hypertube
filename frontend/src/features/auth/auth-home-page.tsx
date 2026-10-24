// Protected `/` route: the placeholder landing page shown once logged in. It
// proves the round trip works: it reads the bootstrapped user off the context
// and offers a way back out. The video library (HYP-13) takes its place.
import { Trans, useTranslation } from 'react-i18next';
import { Button } from '../../ui/ui-button';
import { useAuth } from './auth-context';
import styles from './auth-home-page.module.css';

/**
 * Landing page behind {@link RequireAuth}. Renders the current user's identity
 * and a logout control; it never redirects on logout itself - clearing the
 * auth state flips the guard to `anonymous`, which sends the user to `/login`.
 */
export function HomePage() {
  const { t } = useTranslation('auth');
  const { state, logout } = useAuth();

  // RequireAuth only renders this component in the `authenticated` state, so
  // `state.user` is always set here - the `?.` is a type-level guard, not a
  // real runtime case.
  const user = state.user;

  return (
    <main className={styles.page}>
      <h1>Hypertube</h1>
      <p>
        <Trans
          t={t}
          i18nKey="home.signedIn"
          values={{ username: user?.username, email: user?.email }}
          components={{ strong: <strong /> }}
        />
      </p>
      <Button onClick={logout}>{t('home.logout')}</Button>
    </main>
  );
}
