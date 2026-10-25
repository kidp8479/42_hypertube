// The banner at the top of every page: brand, language, and once signed in the
// account controls and the section links.
import { Link, NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../features/auth/auth-context';
import type { User } from '../features/auth/auth-types';
import { Button } from '../ui/ui-button';
import { UserAvatar } from '../features/users/users-avatar';
import { LanguageSwitcher } from './language-switcher';

const ROW = 'flex items-center gap-2 border-b border-line py-2 sm:gap-3';

/**
 * Who is signed in, as the link to their profile: the avatar and the
 * username. On a phone only the avatar shows; the username stays for screen
 * readers.
 */
function AccountLink({ user }: { user: User }) {
  return (
    <Link to="/profile" className="flex items-center gap-2 no-underline">
      <UserAvatar username={user.username} picture={user.profilePicture} />
      <span className="sr-only sm:not-sr-only">{user.username}</span>
    </Link>
  );
}

const SECTION =
  'border-b border-transparent py-1 font-mono text-xs tracking-label text-muted uppercase no-underline aria-[current=page]:border-orange aria-[current=page]:text-ink';

/**
 * The app header (HYP-19). Signed out it holds the brand and the language
 * picker; signed in it adds the account (a link to the profile), the
 * one-click logout and a second row of section links, so each is one click
 * away from any page.
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
              <AccountLink user={user} />
              <Button className="px-3 py-1 whitespace-nowrap" onClick={logout}>
                {t('header.logout')}
              </Button>
            </>
          )}
        </div>
      </div>
      {user && (
        <nav aria-label={t('header.sections')} className={ROW}>
          <NavLink to="/" end className={SECTION}>
            {t('header.library')}
          </NavLink>
          <NavLink to="/profile" className={SECTION}>
            {t('header.profile')}
          </NavLink>
        </nav>
      )}
    </header>
  );
}
