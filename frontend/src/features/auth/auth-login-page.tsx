// Public /login route: a username-or-email + password form wired to the context `login()`.
// Redirects to `/` on success (and immediately if already authenticated), and
// shows a single generic error on failure - the backend never says which field
// was wrong, so neither do we.
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAccountForm } from './auth-account-form';
import { useAuth } from './auth-context';
import { Alert } from '../../ui/ui-alert';
import { Button } from '../../ui/ui-button';
import { Field } from '../../ui/ui-field';
import { OAuthButtons } from './auth-oauth-buttons';
import { AUTH_COLUMN, AUTH_LINKS } from './auth-form-classes';

/** Router state `RegisterPage` hands off on a successful registration redirect. */
interface LoginLocationState {
  justRegistered?: boolean;
}

/** The `/login` page: the username-or-email + password form and the OAuth buttons. */
export function LoginPage() {
  const { t } = useTranslation('auth');
  const { state, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const justRegistered = (location.state as LoginLocationState | null)
    ?.justRegistered;

  const form = useAccountForm({
    initialValues: { identifier: '', password: '' },
    send: async ({ identifier, password }) => {
      await login(identifier, password);
      navigate('/', { replace: true });
    },
    refusals: { 401: 'login.badCredentials' },
  });
  const badCredentials = form.outcome?.key === 'login.badCredentials';

  // Someone who is already logged in has no business on /login.
  if (state.status === 'authenticated') {
    return <Navigate to="/" replace />;
  }

  return (
    <>
      <form className={`${AUTH_COLUMN} max-w-80`} onSubmit={form.submit}>
        <h1>{t('login.title')}</h1>

        {justRegistered && (
          <Alert tone="success">{t('login.registeredNotice')}</Alert>
        )}

        <Field
          label={t('fields.identifier')}
          type="text"
          value={form.values.identifier}
          onChange={(event) => form.setValue('identifier', event.target.value)}
          autoComplete="username"
          autoCapitalize="none"
          invalid={badCredentials}
          required
        />

        <Field
          label={t('fields.password')}
          type="password"
          value={form.values.password}
          onChange={(event) => form.setValue('password', event.target.value)}
          autoComplete="current-password"
          invalid={badCredentials}
          required
        />

        {form.outcome && (
          <Alert tone={form.outcome.tone}>{t(form.outcome.key)}</Alert>
        )}

        <Button type="submit" variant="solid" disabled={form.isSubmitting}>
          {form.isSubmitting ? t('login.submitting') : t('login.submit')}
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
    </>
  );
}
