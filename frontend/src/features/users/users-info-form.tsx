// The profile page's first form: username, names and profile picture.
import { useTranslation } from 'react-i18next';
import { Alert } from '../../ui/ui-alert';
import { Button } from '../../ui/ui-button';
import { Field } from '../../ui/ui-field';
import { useAccountForm } from '../auth/auth-account-form';
import type { User } from '../auth/auth-types';
import { describeValidationError } from '../auth/auth-validation';
import type { ProfileChanges } from './users-actions';
import { useUpdateProfile } from './users-queries';
import {
  validateInfo,
  type InfoField,
  type InfoValues,
} from './users-validation';

function valuesOf(user: User): InfoValues {
  return {
    username: user.username,
    firstName: user.firstName,
    lastName: user.lastName,
    profilePicture: user.profilePicture ?? '',
  };
}

// Only what differs from the saved profile is sent; an emptied picture is
// sent as null, which removes it.
function changesFrom(user: User, values: InfoValues): ProfileChanges {
  const changes: ProfileChanges = {};
  const saved = valuesOf(user);
  for (const field of ['username', 'firstName', 'lastName'] as const) {
    if (values[field].trim() !== saved[field]) {
      changes[field] = values[field].trim();
    }
  }
  const picture = values.profilePicture.trim();
  if (picture !== saved.profilePicture) {
    changes.profilePicture = picture === '' ? null : picture;
  }
  return changes;
}

const changedFields = (changes: ProfileChanges) =>
  new Set(Object.keys(changes) as InfoField[]);

/** Props of `InfoForm`. */
export interface InfoFormProps {
  /** The signed-in user, as last saved. */
  user: User;
}

/** Edits the public part of one's own profile. Saves only the changed fields. */
export function InfoForm({ user }: InfoFormProps) {
  const { t } = useTranslation('users');
  const { t: tAuth } = useTranslation('auth');
  const save = useUpdateProfile(user);
  const form = useAccountForm({
    initialValues: () => valuesOf(user),
    validate: (values: InfoValues) =>
      validateInfo(values, changedFields(changesFrom(user, values))),
    send: async (values: InfoValues) => {
      const saved = await save(changesFrom(user, values));
      return {
        outcome: { key: 'info.saved', tone: 'success' },
        values: valuesOf(saved),
      };
    },
    refusals: { 409: 'info.usernameTaken' },
  });
  const changes = changesFrom(user, form.values);

  function input(field: InfoField, autoComplete: string, hint?: string) {
    const error = form.errors[field];
    return (
      <Field
        label={tAuth(`fields.${field}`)}
        type={field === 'profilePicture' ? 'url' : 'text'}
        autoComplete={autoComplete}
        value={form.values[field]}
        onChange={(e) => form.setValue(field, e.target.value)}
        hint={hint}
        error={error && describeValidationError(field, error, tAuth)}
        invalid={
          field === 'username' && form.outcome?.key === 'info.usernameTaken'
        }
      />
    );
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={form.submit} noValidate>
      <h2 className="text-lg">{t('info.title')}</h2>
      {input('username', 'username', tAuth('hints.username'))}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(10rem,1fr))] gap-4">
        {input('firstName', 'given-name')}
        {input('lastName', 'family-name')}
      </div>
      {input('profilePicture', 'photo', t('info.pictureHint'))}
      {form.outcome && (
        <Alert tone={form.outcome.tone}>{t(form.outcome.key)}</Alert>
      )}
      <Button
        type="submit"
        variant="solid"
        disabled={form.isSubmitting || Object.keys(changes).length === 0}
      >
        {form.isSubmitting ? t('info.submitting') : t('info.submit')}
      </Button>
    </form>
  );
}
