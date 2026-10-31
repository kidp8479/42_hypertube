// The form that names and creates a new API key.
import { useTranslation } from 'react-i18next';
import { Alert } from '../../ui/ui-alert';
import { Button } from '../../ui/ui-button';
import { Field } from '../../ui/ui-field';
import { useAccountForm } from '../auth/auth-account-form';
import type { ValidationError } from '../auth/auth-validation';
import type { CreatedApiKey } from './api-keys-actions';

// CreateApiClientDto's @Length(1, 50).
const NAME_MAX_LENGTH = 50;

function validateName({
  name,
}: {
  name: string;
}): Partial<Record<'name', ValidationError>> {
  const trimmed = name.trim();
  if (trimmed === '') {
    return { name: { code: 'required' } };
  }
  return trimmed.length > NAME_MAX_LENGTH
    ? { name: { code: 'tooLong', max: NAME_MAX_LENGTH } }
    : {};
}

/** Props of `ApiKeyCreateForm`. */
export interface ApiKeyCreateFormProps {
  /** Sends `POST /api-clients`; resolves to the key, secret included. */
  create: (name: string) => Promise<CreatedApiKey>;
  /** Called with the new key, so the page can show its secret once. */
  onCreated: (key: CreatedApiKey) => void;
}

/** Names a new key and creates it. At most 5 keys: the 6th is a 409. */
export function ApiKeyCreateForm({ create, onCreated }: ApiKeyCreateFormProps) {
  const { t } = useTranslation('apiKeys');
  const form = useAccountForm({
    initialValues: { name: '' },
    validate: validateName,
    send: async ({ name }) => {
      onCreated(await create(name.trim()));
    },
    refusals: { 409: 'create.tooMany' },
  });
  const error = form.errors.name;

  return (
    <form className="flex flex-col gap-4" onSubmit={form.submit} noValidate>
      <Field
        label={t('name.label')}
        value={form.values.name}
        onChange={(e) => form.setValue('name', e.target.value)}
        autoComplete="off"
        hint={t('name.hint')}
        error={
          error &&
          (error.code === 'tooLong'
            ? t('name.tooLong', { max: error.max })
            : t('name.required'))
        }
      />
      {form.outcome && (
        <Alert tone={form.outcome.tone}>{t(form.outcome.key)}</Alert>
      )}
      <Button type="submit" variant="solid" disabled={form.isSubmitting}>
        {form.isSubmitting ? t('create.submitting') : t('create.submit')}
      </Button>
    </form>
  );
}
