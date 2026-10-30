// The "loading" line a page shows while its data is on the way.
import { useTranslation } from 'react-i18next';

/**
 * Only appears when the wait is noticeable (`animate-appear-late`), so a fast
 * answer never flashes it.
 */
export function LoadingStatus() {
  const { t } = useTranslation('common');
  return (
    <p
      role="status"
      className="my-12 text-center font-mono text-sm text-muted opacity-0 animate-appear-late"
    >
      {t('loading')}
    </p>
  );
}
