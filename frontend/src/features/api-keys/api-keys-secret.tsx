// The one place a new API key's secret is ever shown.
import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert } from '../../ui/ui-alert';
import { Button } from '../../ui/ui-button';
import type { CreatedApiKey } from './api-keys-actions';

type CopyState = 'idle' | 'copied' | 'failed';

/** Props of `ApiKeySecret`. */
export interface ApiKeySecretProps {
  apiKey: CreatedApiKey;
  /** Hides the secret for good. */
  onDone: () => void;
}

/**
 * Shows a key just created with its secret, which the backend only keeps as
 * a hash: once this box is closed, nothing can show it again. The secret is
 * selectable as plain text, and a copy button puts it on the clipboard.
 */
export function ApiKeySecret({ apiKey, onDone }: ApiKeySecretProps) {
  const { t } = useTranslation('apiKeys');
  const [copy, setCopy] = useState<CopyState>('idle');
  const titleId = useId();

  async function copySecret() {
    try {
      await navigator.clipboard.writeText(apiKey.secret);
      setCopy('copied');
    } catch {
      // The clipboard API needs a secure context and a permission; the
      // secret stays on screen to copy by hand.
      setCopy('failed');
    }
  }

  return (
    <section
      aria-labelledby={titleId}
      className="flex flex-col gap-3 border border-ink p-4"
    >
      <h3 id={titleId} className="m-0 text-base">
        {t('created.title')}
      </h3>
      <p className="m-0 text-sm text-muted">{t('created.warning')}</p>
      <dl className="grid m-0 gap-1 font-mono text-sm">
        <dt className="text-muted">{t('created.client')}</dt>
        <dd className="m-0 wrap-anywhere">{apiKey.clientId}</dd>
        <dt className="text-muted">{t('created.secret')}</dt>
        <dd className="m-0 wrap-anywhere select-all">{apiKey.secret}</dd>
      </dl>
      {copy === 'copied' && <Alert tone="success">{t('created.copied')}</Alert>}
      {copy === 'failed' && (
        <Alert tone="error">{t('created.copyFailed')}</Alert>
      )}
      <div className="flex flex-wrap gap-3">
        <Button type="button" variant="solid" onClick={() => void copySecret()}>
          {t('created.copy')}
        </Button>
        <Button type="button" onClick={onDone}>
          {t('created.done')}
        </Button>
      </div>
    </section>
  );
}
