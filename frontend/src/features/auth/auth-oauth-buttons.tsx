// "Continue with 42 / GitHub" links shared by the login and register pages.
import { useTranslation } from 'react-i18next';
import { API_BASE } from '../../lib/api';
import { buttonClasses } from '../../ui/ui-button-classes';

/**
 * Plain links, not fetches: the OAuth handshake is a chain of full-page
 * redirects (backend -> provider -> backend -> SPA), and the state cookie
 * the backend sets must land in the browser before leaving for the provider.
 */
export function OAuthButtons() {
  const { t } = useTranslation('auth');
  return (
    <div className="grid grid-fit-button gap-2">
      <a
        className={buttonClasses('outline')}
        href={`${API_BASE}/auth/42/login`}
      >
        {t('oauth.continueWith', { provider: '42' })}
      </a>
      <a
        className={buttonClasses('outline')}
        href={`${API_BASE}/auth/github/login`}
      >
        {t('oauth.continueWith', { provider: 'GitHub' })}
      </a>
    </div>
  );
}
