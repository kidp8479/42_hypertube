// Public /oauth/callback route: where the backend sends the browser back
// after a 42 or GitHub login, with either a single-use `code` to trade for a
// token or an `error` reason (ADR-0007).
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { OAuthCodeRejectedError } from './auth-actions';
import { Alert } from '../../ui/ui-alert';
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

/**
 * The `/oauth/callback` page: trades the single-use code for a token and
 * lands on `/`, or shows why the sign-in failed. It renders nothing but a
 * status line, since the user only sees it for a moment.
 */
export function OAuthCallbackPage() {
  const { t } = useTranslation('auth');
  const { state, loginWithOAuthCode } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [{ code, error: initialError }] = useState(() =>
    readCallbackParams(searchParams),
  );
  const [error, setError] = useState<OAuthErrorCode | null>(initialError);
  // The code is single-use: StrictMode runs this effect twice in dev, and a
  // ref (unlike state) survives that, so only the first run exchanges it.
  const exchangeStarted = useRef(false);
  const bootstrapping = state.status === 'loading';

  // Out of the URL right away, before any request, so it never reaches
  // browser history or a Referer header.
  useEffect(() => {
    if (code) {
      navigate('/oauth/callback', { replace: true });
    }
  }, [code, navigate]);

  // Held back until AuthProvider's startup /users/me check settles: with a
  // stale token in storage, its late 401 would otherwise wipe the token the
  // exchange just stored and sign the user straight back out.
  useEffect(() => {
    if (!code || bootstrapping || exchangeStarted.current) {
      return;
    }
    exchangeStarted.current = true;
    loginWithOAuthCode(code).then(
      () => navigate('/', { replace: true }),
      (caught: unknown) => {
        setError(
          caught instanceof OAuthCodeRejectedError ? 'expired' : 'failed',
        );
      },
    );
  }, [code, bootstrapping, loginWithOAuthCode, navigate]);

  return (
    <main className={styles.page}>
      {/* React hoists this to <head>: no page loaded from here may learn the callback URL. */}
      <meta name="referrer" content="no-referrer" />
      <h1>{t('oauthCallback.title')}</h1>
      {error ? (
        <>
          <Alert tone="error">{t(`oauthCallback.errors.${error}`)}</Alert>
          <p>
            <Link to="/login">{t('oauthCallback.backToLogin')}</Link>
          </p>
        </>
      ) : (
        <p>{t('oauthCallback.signingIn')}</p>
      )}
    </main>
  );
}
