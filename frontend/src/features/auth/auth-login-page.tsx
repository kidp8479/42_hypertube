// Public /login route: an email + password form wired to the context `login()`.
// Redirects to `/` on success (and immediately if already authenticated), and
// shows a single generic error on failure - the backend never says which field
// was wrong, so neither do we.
import { useState, type SyntheticEvent } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ApiError } from '../../lib/api';
import { useAuth } from './auth-context';
import styles from './auth-login-page.module.css';

const GENERIC_ERROR = 'Something went wrong. Please try again.';
const BAD_CREDENTIALS = 'Invalid email or password.';
const REGISTERED_NOTICE = 'Account created. Please sign in.';

/** Router state `RegisterPage` hands off on a successful registration redirect. */
interface LoginLocationState {
  justRegistered?: boolean;
}

export function LoginPage() {
  const { state, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const justRegistered = (location.state as LoginLocationState | null)
    ?.justRegistered;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
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
      setError(is401 ? BAD_CREDENTIALS : GENERIC_ERROR);
      setIsSubmitting(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <h1>Log in</h1>

      {justRegistered && <p className={styles.notice}>{REGISTERED_NOTICE}</p>}

      <label className={styles.field}>
        Email
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="email"
          required
        />
      </label>

      <label className={styles.field}>
        Password
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
          {error}
        </p>
      )}

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Logging in...' : 'Log in'}
      </button>

      <p>
        No account yet? <Link to="/register">Register</Link>
      </p>
    </form>
  );
}
