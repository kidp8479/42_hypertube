// The "API keys" section of the profile page (HYP-123, ADR-0015).
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { CreatedApiKey } from './api-keys-actions';
import { ApiKeyCreateForm } from './api-keys-create-form';
import { ApiKeyList } from './api-keys-list';
import { useApiKeyWrites } from './api-keys-queries';
import { ApiKeySecret } from './api-keys-secret';

/**
 * Creates, lists and revokes the caller's API keys, the credentials of
 * `POST /oauth/token`. A new key's secret shows once, in its own box, and is
 * gone from the page when that box closes.
 */
export function ApiKeysSection() {
  const { t } = useTranslation('apiKeys');
  const { create, revoke } = useApiKeyWrites();
  const [created, setCreated] = useState<CreatedApiKey | null>(null);

  return (
    <section className="flex flex-col gap-4">
      <h2 className="m-0 text-lg">{t('title')}</h2>
      <p className="m-0 text-muted">{t('intro')}</p>
      {created ? (
        <ApiKeySecret apiKey={created} onDone={() => setCreated(null)} />
      ) : (
        <ApiKeyCreateForm create={create.mutateAsync} onCreated={setCreated} />
      )}
      <ApiKeyList revoke={revoke.mutateAsync} />
    </section>
  );
}
