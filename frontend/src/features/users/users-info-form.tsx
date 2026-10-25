// The profile page's first form: username, names and profile picture.
import { useState, type SyntheticEvent } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ApiError } from '../../lib/api';
import { Alert } from '../../ui/ui-alert';
import { Button } from '../../ui/ui-button';
import { Field } from '../../ui/ui-field';
import { useAuth } from '../auth/auth-context';
import type { User } from '../auth/auth-types';
import {
  describeValidationError,
  type FieldErrors,
} from '../auth/auth-validation';
import { updateProfile, type ProfileChanges } from './users-actions';
import {
  validateInfo,
  type InfoField,
  type InfoValues,
} from './users-validation';

type Outcome = 'info.saved' | 'info.usernameTaken' | 'errors.generic';

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

/** Props of `InfoForm`. */
export interface InfoFormProps {
  /** The signed-in user, as last saved. */
  user: User;
}

/** Edits the public part of one's own profile. Saves only the changed fields. */
export function InfoForm({ user }: InfoFormProps) {
  const { t } = useTranslation('users');
  const { t: tAuth } = useTranslation('auth');
  const { updateUser } = useAuth();
  const [values, setValues] = useState<InfoValues>(() => valuesOf(user));
  const [errors, setErrors] = useState<FieldErrors<InfoField>>({});
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  // Through a mutation, so a 401 that survives the token refresh reaches the
  // session-expired net (lib/query-client.ts).
  const save = useMutation({
    mutationFn: (changes: ProfileChanges) => updateProfile(user.id, changes),
  });
  const changes = changesFrom(user, values);

  async function handleSubmit(event: SyntheticEvent) {
    event.preventDefault();
    setOutcome(null);
    const validationErrors = validateInfo(values, valuesOf(user));
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) {
      return;
    }
    try {
      const saved = await save.mutateAsync(changes);
      updateUser(saved);
      setValues(valuesOf(saved));
      setOutcome('info.saved');
    } catch (caught) {
      const isConflict = caught instanceof ApiError && caught.status === 409;
      setOutcome(isConflict ? 'info.usernameTaken' : 'errors.generic');
    }
  }

  function input(field: InfoField, autoComplete: string, hint?: string) {
    const error = errors[field];
    return (
      <Field
        label={tAuth(`fields.${field}`)}
        type={field === 'profilePicture' ? 'url' : 'text'}
        autoComplete={autoComplete}
        value={values[field]}
        onChange={(e) => setValues({ ...values, [field]: e.target.value })}
        hint={hint}
        error={error && describeValidationError(field, error, tAuth)}
        invalid={field === 'username' && outcome === 'info.usernameTaken'}
      />
    );
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
      <h2 className="text-lg">{t('info.title')}</h2>
      {input('username', 'username', tAuth('hints.username'))}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(10rem,1fr))] gap-4">
        {input('firstName', 'given-name')}
        {input('lastName', 'family-name')}
      </div>
      {input('profilePicture', 'photo', t('info.pictureHint'))}
      {outcome && (
        <Alert tone={outcome === 'info.saved' ? 'success' : 'error'}>
          {t(outcome)}
        </Alert>
      )}
      <Button
        type="submit"
        variant="solid"
        disabled={save.isPending || Object.keys(changes).length === 0}
      >
        {save.isPending ? t('info.submitting') : t('info.submit')}
      </Button>
    </form>
  );
}
