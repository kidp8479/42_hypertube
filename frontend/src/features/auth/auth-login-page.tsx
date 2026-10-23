// Public /login route: an email + password form wired to the context `login()`.
// Redirects to `/` on success (and immediately if already authenticated), and
// shows a single generic error on failure - the backend never says which field
// was wrong, so neither do we.
import { useState, type SyntheticEvent } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ApiError } from '../../lib/api';
import { useAuth } from './auth-context';
import { OAuthButtons } from './auth-oauth-buttons';
import styles from './auth-login-page.module.css';

// Stored as a translation key, not a sentence, so it follows a language switch.
type LoginError = 'login.badCredentials' | 'errors.generic';

/** Router state `RegisterPage` hands off on a successful registration redirect. */
interface LoginLocationState {
  justRegistered?: boolean;
}

/** The `/login` page: the email + password form and the OAuth buttons. */
export function LoginPage() {
  const { t } = useTranslation('auth');
  const { state, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const justRegistered = (location.state as LoginLocationState | null)
    ?.justRegistered;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<LoginError | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Someone who is already logged in has no business on /login.
  if (state.status === 'authenticated') {
    return <Navigate to="/" replace />;
  }

  async function handleSubmit(event: SyntheticEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await login(email, password);
      navigate('/', { replace: true });
    } catch (caught) {
      const is401 = caught instanceof ApiError && caught.status === 401;
      setError(is401 ? 'login.badCredentials' : 'errors.generic');
      setIsSubmitting(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <h1>{t('login.title')}</h1>

      {justRegistered && (
        <p className={styles.notice}>{t('login.registeredNotice')}</p>
      )}

      <label className={styles.field}>
        {t('fields.email')}
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="email"
          required
        />
      </label>

      <label className={styles.field}>
        {t('fields.password')}
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="current-password"
          required
        />
      </label>

      {error && (
        <p className={styles.error} role="alert">
          {t(error)}
        </p>
      )}

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? t('login.submitting') : t('login.submit')}
      </button>

      <OAuthButtons />

      <p>
        {t('login.noAccount')} <Link to="/register">{t('login.register')}</Link>
      </p>
    </form>
  );
}
