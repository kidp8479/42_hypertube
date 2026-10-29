// The profile page's second form: email and password, behind the current one.
import { useTranslation } from 'react-i18next';
import { Alert } from '../../ui/ui-alert';
import { Button } from '../../ui/ui-button';
import { Field } from '../../ui/ui-field';
import { useAccountForm, type FormOutcome } from '../auth/auth-account-form';
import type { User } from '../auth/auth-types';
import { describeValidationError } from '../auth/auth-validation';
import type { ProfileChanges } from './users-actions';
import { useUpdateProfile } from './users-queries';
import {
  validateCredentials,
  type CredentialsField,
  type CredentialsValues,
} from './users-validation';

type Outcome =
  | 'credentials.savedEmail'
  | 'credentials.savedPassword'
  | 'credentials.savedBoth'
  | 'credentials.nothingToChange'
  | 'credentials.wrongPassword'
  | 'credentials.emailTaken'
  | 'credentials.noPassword';

// What each refusal of `PATCH /users/:id` means here. The form always sends
// `currentPassword`, so a 400 is the account having no password to confirm
// with (`UsersService.update`), or an address that passes the loose client
// rule but not @IsEmail: the message names both.
const REFUSALS: Partial<Record<number, Outcome>> = {
  400: 'credentials.noPassword',
  403: 'credentials.wrongPassword',
  409: 'credentials.emailTaken',
};

const NOTHING_TO_CHANGE: FormOutcome<Outcome> = {
  key: 'credentials.nothingToChange',
  tone: 'error',
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

function savedKey(changes: ProfileChanges): Outcome {
  if (changes.email !== undefined && changes.password !== undefined) {
    return 'credentials.savedBoth';
  }
  return changes.email !== undefined
    ? 'credentials.savedEmail'
    : 'credentials.savedPassword';
}

/** Props of `CredentialsForm`. */
export interface CredentialsFormProps {
  /** The signed-in user, as last saved. */
  user: User;
}

/**
 * Changes the email and/or the password. The backend asks for the current
 * password, then ends every other session (ADR-0011): this one keeps going.
 */
export function CredentialsForm({ user }: CredentialsFormProps) {
  const { t } = useTranslation('users');
  const { t: tAuth } = useTranslation('auth');
  const save = useUpdateProfile(user);
  const form = useAccountForm({
    initialValues: () => emptyValues(user),
    validate: validateCredentials,
    send: async (values: CredentialsValues) => {
      const changes = changesFrom(user, values);
      if (Object.keys(changes).length === 0) {
        return { outcome: NOTHING_TO_CHANGE };
      }
      const saved = await save({
        ...changes,
        currentPassword: values.currentPassword,
      });
      return {
        outcome: { key: savedKey(changes), tone: 'success' },
        values: emptyValues(saved),
      };
    },
    refusals: REFUSALS,
  });

  function input(field: CredentialsField, label: string, hint?: string) {
    const error = form.errors[field];
    return (
      <Field
        label={label}
        {...INPUTS[field]}
        value={form.values[field]}
        onChange={(e) => form.setValue(field, e.target.value)}
        hint={hint}
        error={error && describeValidationError(field, error, tAuth)}
        invalid={
          field === 'currentPassword' &&
          form.outcome?.key === 'credentials.wrongPassword'
        }
      />
    );
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={form.submit} noValidate>
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
      {form.outcome && (
        <Alert tone={form.outcome.tone}>{t(form.outcome.key)}</Alert>
      )}
      <Button type="submit" variant="solid" disabled={form.isSubmitting}>
        {form.isSubmitting
          ? t('credentials.submitting')
          : t('credentials.submit')}
      </Button>
    </form>
  );
}
