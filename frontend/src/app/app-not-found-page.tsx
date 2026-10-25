// Catch-all route: what an unknown URL shows instead of a silent redirect.
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { buttonClasses } from '../ui/ui-button-classes';

/**
 * The 404 page, for signed-in and signed-out visitors alike. The link goes to
 * `/`, where the guard sends a signed-out visitor on to the login page.
 */
export function NotFoundPage() {
  const { t } = useTranslation('common');

  return (
    <div className="mx-auto my-12 flex max-w-80 flex-col items-start gap-4">
      <h1>{t('notFound.title')}</h1>
      <p className="text-muted">{t('notFound.body')}</p>
      <Link to="/" className={buttonClasses('outline')}>
        {t('notFound.home')}
      </Link>
    </div>
  );
}
