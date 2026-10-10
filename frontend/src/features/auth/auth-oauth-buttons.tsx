// "Continue with 42 / GitHub" links shared by the login and register pages.
import { API_BASE } from '../../lib/api';
import styles from './auth-oauth-buttons.module.css';

/**
 * Plain links, not fetches: the OAuth handshake is a chain of full-page
 * redirects (backend -> provider -> backend -> SPA), and the state cookie
 * the backend sets must land in the browser before leaving for the provider.
 */
export function OAuthButtons() {
  return (
    <div className={styles.providers}>
      <a href={`${API_BASE}/auth/42/login`}>Continue with 42</a>
      <a href={`${API_BASE}/auth/github/login`}>Continue with GitHub</a>
    </div>
  );
}
