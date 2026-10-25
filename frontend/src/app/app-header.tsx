// The banner at the top of every page: brand, language, and once signed in the
// account controls and the section links.
import { Link, NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../features/auth/auth-context';
import type { User } from '../features/auth/auth-types';
import { Button } from '../ui/ui-button';
import { LanguageSwitcher } from './language-switcher';

const ROW = 'flex items-center gap-2 border-b border-line py-2 sm:gap-3';

/**
 * Who is signed in: a round initial and the username. On a phone only the
 * initial shows; the username stays for screen readers.
 */
function AccountBadge({ user }: { user: User }) {
  return (
    <span className="flex items-center gap-2">
      <span
        aria-hidden="true"
        className="inline-flex size-6 items-center justify-center rounded-round border border-edge font-mono text-xs uppercase"
      >
        {user.username.charAt(0)}
      </span>
      <span className="sr-only sm:not-sr-only">{user.username}</span>
    </span>
  );
}

/**
 * The app header (HYP-19). Signed out it holds the brand and the language
 * picker; signed in it adds the account, the one-click logout and a second row
 * of section links, so each is one click away from any page.
 */
export function AppHeader() {
  const { t } = useTranslation('common');
  const { state, logout } = useAuth();
  const user = state.status === 'authenticated' ? state.user : null;

  return (
    <header>
      {/* On a narrow phone the controls wrap together under the brand, so a
          long label in another language never pushes them off the screen. */}
      <div className={`${ROW} flex-wrap`}>
        <Link
          to="/"
          className="mr-auto font-mono font-medium tracking-label text-mint uppercase no-underline"
        >
          Hypertube
        </Link>
        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <LanguageSwitcher />
          {user && (
            <>
              <AccountBadge user={user} />
              <Button className="px-3 py-1 whitespace-nowrap" onClick={logout}>
                {t('header.logout')}
              </Button>
            </>
          )}
        </div>
      </div>
      {user && (
        <nav aria-label={t('header.sections')} className={ROW}>
          <NavLink
            to="/"
            end
            className="border-b border-transparent py-1 font-mono text-xs tracking-label text-muted uppercase no-underline aria-[current=page]:border-orange aria-[current=page]:text-ink"
          >
            {t('header.library')}
          </NavLink>
        </nav>
      )}
    </header>
  );
}
