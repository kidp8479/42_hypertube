// The caller's API keys, each with its revoke button.
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LoadingStatus } from '../../app/app-loading';
import { Alert } from '../../ui/ui-alert';
import { Button } from '../../ui/ui-button';
import type { ApiKey } from './api-keys-actions';
import { useApiKeys } from './api-keys-queries';

type Outcome = 'list.revoked' | 'errors.generic';

/** Props of `ApiKeyList`. */
export interface ApiKeyListProps {
  /** Sends `DELETE /api-clients/:id`. */
  revoke: (id: number) => Promise<void>;
}

/**
 * Lists the keys by name, `clientId` and creation date, never a secret (the
 * API does not have one to give). Loading, empty and error states included.
 */
export function ApiKeyList({ revoke }: ApiKeyListProps) {
  const { t, i18n } = useTranslation('apiKeys');
  const keys = useApiKeys();
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [revoking, setRevoking] = useState<number | null>(null);
  const date = new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium' });

  async function revokeKey(key: ApiKey) {
    setOutcome(null);
    setRevoking(key.id);
    try {
      await revoke(key.id);
      setOutcome('list.revoked');
    } catch {
      setOutcome('errors.generic');
    } finally {
      setRevoking(null);
    }
  }

  if (keys.isPending) {
    return <LoadingStatus />;
  }
  if (keys.isError) {
    return (
      <div className="flex flex-col gap-3">
        <Alert tone="error">{t('errors.generic')}</Alert>
        <Button type="button" onClick={() => void keys.refetch()}>
          {t('errors.retry')}
        </Button>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-3">
      {outcome && (
        <Alert tone={outcome === 'list.revoked' ? 'success' : 'error'}>
          {t(outcome)}
        </Alert>
      )}
      {keys.data.length === 0 ? (
        <p className="m-0 text-muted">{t('list.empty')}</p>
      ) : (
        <ul
          aria-label={t('list.label')}
          className="flex flex-col m-0 gap-3 p-0"
        >
          {keys.data.map((key) => (
            <li
              key={key.id}
              className="flex flex-wrap items-center justify-between gap-3 border border-line p-3"
            >
              <div className="min-w-0">
                <p className="m-0 wrap-anywhere">{key.name}</p>
                <p className="m-0 font-mono text-xs wrap-anywhere text-muted">
                  {key.clientId} ·{' '}
                  {t('list.createdOn', {
                    date: date.format(new Date(key.createdAt)),
                  })}
                </p>
              </div>
              <Button
                type="button"
                aria-label={t('list.revokeName', { name: key.name })}
                disabled={revoking !== null}
                onClick={() => void revokeKey(key)}
              >
                {t('list.revoke')}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
