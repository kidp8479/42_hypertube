// The frame around every route: header, the page in the one <main>, footer.
import { Outlet, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AppHeader } from './app-header';
import { AppErrorBoundary } from './app-error-boundary';

const REPOSITORY_URL = 'https://github.com/kidp8479/42_hypertube';

/**
 * Layout route wrapping the whole route table (HYP-19): pages render only
 * their own content, never a `<main>`, a header or a footer. A page that
 * throws while rendering is replaced by an error message
 * ({@link AppErrorBoundary}), the header kept. The column fills
 * the viewport, so the footer sits at the bottom even on a short page.
 */
export function AppLayout() {
  const { t } = useTranslation('common');
  const { pathname } = useLocation();

  return (
    <div className="flex min-h-dvh flex-col">
      <AppHeader />
      <main className="flex-1">
        <AppErrorBoundary key={pathname}>
          <Outlet />
        </AppErrorBoundary>
      </main>
      <footer className="flex flex-wrap justify-between gap-x-4 gap-y-1 border-t border-line py-3 text-xs text-muted">
        <span>{t('footer.project')}</span>
        <a
          href={REPOSITORY_URL}
          target="_blank"
          rel="noreferrer"
          className="text-muted"
        >
          {t('footer.source')}
        </a>
      </footer>
    </div>
  );
}
