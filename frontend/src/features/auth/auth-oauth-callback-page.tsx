// Public /oauth/callback route: where the backend sends the browser back
// after a 42 or GitHub login, with either a single-use `code` to trade for a
// token or an `error` reason (ADR-0007).
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ApiError } from '../../lib/api';
import { useAuth } from './auth-context';
import styles from './auth-oauth-callback-page.module.css';

/** The backend's `?error=` reasons, plus `expired` for a rejected code. */
type OAuthErrorCode = 'cancelled' | 'email_unverified' | 'failed' | 'expired';

/**
 * Narrows the `?error=` query parameter: anything the backend does not send
 * (a hand-edited URL) reads as a plain failure rather than a blank page.
 */
function parseErrorParam(value: string): OAuthErrorCode {
  return value === 'cancelled' || value === 'email_unverified'
    ? value
    : 'failed';
}

/**
 * The one place that turns an error code into text - the i18n work swaps
 * this body for `t()` lookups, like `describeValidationError`.
 */
function describeOAuthError(code: OAuthErrorCode): string {
  switch (code) {
    case 'cancelled':
      return 'Sign-in was cancelled.';
    case 'email_unverified':
      return 'Your GitHub account has no verified email address. Verify one on GitHub, then try again.';
    case 'expired':
      return 'This sign-in link has expired. Please try again.';
    case 'failed':
      return 'Sign-in failed. Please try again.';
  }
}

/**
 * Reads the callback parameters once, on the first render: the code is
 * stripped from the URL right after, and the reason shown must not change
 * when it is.
 */
function readCallbackParams(params: URLSearchParams) {
  const code = params.get('code');
  const error = params.get('error');
  if (error !== null || !code) {
    return { code: null, error: parseErrorParam(error ?? '') };
  }
  return { code, error: null };
}

export function OAuthCallbackPage() {
  const { loginWithOAuthCode } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [{ code, error: initialError }] = useState(() =>
    readCallbackParams(searchParams),
  );
  const [error, setError] = useState<OAuthErrorCode | null>(initialError);
  // The code is single-use: StrictMode runs this effect twice in dev, and a
  // ref (unlike state) survives that, so only the first run exchanges it.
  const exchangeStarted = useRef(false);

  useEffect(() => {
    if (!code || exchangeStarted.current) {
      return;
    }
    exchangeStarted.current = true;
    // Out of the URL before any request, so it never reaches browser
    // history or a Referer header.
    navigate('/oauth/callback', { replace: true });
    loginWithOAuthCode(code).then(
      () => navigate('/', { replace: true }),
      (caught: unknown) => {
        const is401 = caught instanceof ApiError && caught.status === 401;
        setError(is401 ? 'expired' : 'failed');
      },
    );
  }, [code, loginWithOAuthCode, navigate]);

  return (
    <main className={styles.page}>
      {/* React hoists this to <head>: no page loaded from here may learn the callback URL. */}
      <meta name="referrer" content="no-referrer" />
      <h1>Sign in</h1>
      {error ? (
        <>
          <p className={styles.error} role="alert">
            {describeOAuthError(error)}
          </p>
          <p>
            <Link to="/login">Back to log in</Link>
          </p>
        </>
      ) : (
        <p>Signing you in...</p>
      )}
    </main>
  );
}
