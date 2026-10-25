// Public /login route: an email + password form wired to the context `login()`.
// Redirects to `/` on success (and immediately if already authenticated), and
// shows a single generic error on failure - the backend never says which field
// was wrong, so neither do we.
import { useState, type SyntheticEvent } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ApiError } from '../../lib/api';
import { useAuth } from './auth-context';
import { Alert } from '../../ui/ui-alert';
import { Button } from '../../ui/ui-button';
import { Field } from '../../ui/ui-field';
import { OAuthButtons } from './auth-oauth-buttons';
import { AUTH_LINKS } from './auth-form-classes';

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
    <main>
      <form
        className="mx-auto my-12 flex max-w-80 flex-col gap-4"
        onSubmit={handleSubmit}
      >
        <h1>{t('login.title')}</h1>

        {justRegistered && (
          <Alert tone="success">{t('login.registeredNotice')}</Alert>
        )}

        <Field
          label={t('fields.email')}
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="email"
          placeholder={t('placeholders.email')}
          invalid={error === 'login.badCredentials'}
          required
        />

        <Field
          label={t('fields.password')}
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="current-password"
          invalid={error === 'login.badCredentials'}
          required
        />

        {error && <Alert tone="error">{t(error)}</Alert>}

        <Button type="submit" variant="solid" disabled={isSubmitting}>
          {isSubmitting ? t('login.submitting') : t('login.submit')}
        </Button>

        <OAuthButtons />

        <div className={AUTH_LINKS}>
          {/* Not wired yet: password reset is HYP-34. Kept for the layout. */}
          <a
            href="#forgot-password"
            onClick={(event) => event.preventDefault()}
          >
            {t('login.forgotPassword')}
          </a>
          <Link to="/register">{t('login.createAccount')}</Link>
        </div>
      </form>
    </main>
  );
}
