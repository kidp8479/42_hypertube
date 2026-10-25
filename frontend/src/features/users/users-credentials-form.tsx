// The profile page's second form: email and password, behind the current one.
import { useState, type SyntheticEvent } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ApiError } from '../../lib/api';
import { Alert } from '../../ui/ui-alert';
import { Button } from '../../ui/ui-button';
import { Field } from '../../ui/ui-field';
import { useAuth } from '../auth/auth-context';
import type { User } from '../auth/auth-types';
import { describeValidationError } from '../auth/auth-validation';
import { updateProfile, type ProfileChanges } from './users-actions';
import {
  validateCredentials,
  type CredentialsField,
  type CredentialsValues,
  type FieldErrors,
} from './users-validation';

type Outcome =
  | 'credentials.saved'
  | 'credentials.nothingToChange'
  | 'credentials.wrongPassword'
  | 'credentials.emailTaken'
  | 'credentials.noPassword'
  | 'errors.generic';

// What each refusal of `PATCH /users/:id` means here. The form always sends
// `currentPassword`, so a 400 is the account having no password to confirm
// with (`UsersService.update`), or an address that passes the loose client
// rule but not @IsEmail: the message names both.
const REFUSALS: Partial<Record<number, Outcome>> = {
  400: 'credentials.noPassword',
  403: 'credentials.wrongPassword',
  409: 'credentials.emailTaken',
};

const INPUTS: Record<
  CredentialsField,
  { type: 'email' | 'password'; autoComplete: string }
> = {
  email: { type: 'email', autoComplete: 'email' },
  password: { type: 'password', autoComplete: 'new-password' },
  confirmPassword: { type: 'password', autoComplete: 'new-password' },
  currentPassword: { type: 'password', autoComplete: 'current-password' },
};

function emptyValues(user: User): CredentialsValues {
  return {
    email: user.email,
    password: '',
    confirmPassword: '',
    currentPassword: '',
  };
}

// The email goes only when it changed: the backend treats a new email as a
// credential change, which ends the other sessions.
function changesFrom(user: User, values: CredentialsValues): ProfileChanges {
  const changes: ProfileChanges = {};
  const email = values.email.trim().toLowerCase();
  if (email !== user.email) {
    changes.email = email;
  }
  if (values.password !== '') {
    changes.password = values.password;
  }
  return changes;
}

/**
 * Changes the email and/or the password. The backend asks for the current
 * password, then ends every other session (ADR-0011): this one keeps going.
 */
export function CredentialsForm({ user }: { user: User }) {
  const { t } = useTranslation('users');
  const { t: tAuth } = useTranslation('auth');
  const { updateUser } = useAuth();
  const [values, setValues] = useState(() => emptyValues(user));
  const [errors, setErrors] = useState<FieldErrors<CredentialsField>>({});
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  // Through a mutation, so a 401 that survives the token refresh reaches the
  // session-expired net (lib/query-client.ts).
  const save = useMutation({
    mutationFn: (changes: ProfileChanges) => updateProfile(user.id, changes),
  });

  async function handleSubmit(event: SyntheticEvent) {
    event.preventDefault();
    setOutcome(null);
    const validationErrors = validateCredentials(values);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) {
      return;
    }
    const changes = changesFrom(user, values);
    if (Object.keys(changes).length === 0) {
      setOutcome('credentials.nothingToChange');
      return;
    }
    try {
      const saved = await save.mutateAsync({
        ...changes,
        currentPassword: values.currentPassword,
      });
      updateUser(saved);
      setValues(emptyValues(saved));
      setOutcome('credentials.saved');
    } catch (caught) {
      const status = caught instanceof ApiError ? caught.status : 0;
      setOutcome(REFUSALS[status] ?? 'errors.generic');
    }
  }

  function input(field: CredentialsField, label: string, hint?: string) {
    const error = errors[field];
    return (
      <Field
        label={label}
        {...INPUTS[field]}
        value={values[field]}
        onChange={(e) => setValues({ ...values, [field]: e.target.value })}
        hint={hint}
        error={error && describeValidationError(field, error, tAuth)}
        invalid={
          field === 'currentPassword' && outcome === 'credentials.wrongPassword'
        }
      />
    );
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
      <h2 className="text-lg">{t('credentials.title')}</h2>
      <p className="m-0 text-muted">{t('credentials.intro')}</p>
      {input('email', tAuth('fields.email'))}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(10rem,1fr))] gap-4">
        {input(
          'password',
          t('credentials.newPassword'),
          t('credentials.newPasswordHint'),
        )}
        {input('confirmPassword', tAuth('fields.confirmPassword'))}
      </div>
      {input('currentPassword', tAuth('fields.currentPassword'))}
      {outcome && (
        <Alert tone={outcome === 'credentials.saved' ? 'success' : 'error'}>
          {t(outcome)}
        </Alert>
      )}
      <Button type="submit" variant="solid" disabled={save.isPending}>
        {save.isPending ? t('credentials.submitting') : t('credentials.submit')}
      </Button>
    </form>
  );
}
