// What the two profile forms show and send: their values from the saved
// profile, and the changes a submit turns into a `PATCH /users/:id` body.
import type { User } from '../auth/auth-types';
import type { ProfileChanges } from './users-actions';
import type { CredentialsValues, InfoValues } from './users-validation';

/** The information form's values for a saved profile. */
export function infoValues(user: User): InfoValues {
  return {
    username: user.username,
    firstName: user.firstName,
    lastName: user.lastName,
  };
}

/** Only what differs from the saved profile, trimmed. */
export function infoChanges(user: User, values: InfoValues): ProfileChanges {
  const changes: ProfileChanges = {};
  const saved = infoValues(user);
  for (const field of ['username', 'firstName', 'lastName'] as const) {
    if (values[field].trim() !== saved[field]) {
      changes[field] = values[field].trim();
    }
  }
  return changes;
}

/** The email and password form's values: the saved email, every password empty. */
export function credentialsValues(user: User): CredentialsValues {
  return {
    email: user.email,
    password: '',
    confirmPassword: '',
    currentPassword: '',
  };
}

/**
 * The email goes only when it changed (compared lower-cased, as stored): the
 * backend treats a new email as a credential change, which ends the other
 * sessions. The password goes when one was typed.
 */
export function credentialsChanges(
  user: User,
  values: CredentialsValues,
): ProfileChanges {
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

/** The message after a saved credentials change. */
export type CredentialsSavedKey =
  | 'credentials.savedEmail'
  | 'credentials.savedPassword'
  | 'credentials.savedBoth';

/** Names what a saved credentials change touched. */
export function credentialsSavedKey(
  changes: ProfileChanges,
): CredentialsSavedKey {
  if (changes.email !== undefined && changes.password !== undefined) {
    return 'credentials.savedBoth';
  }
  return changes.email !== undefined
    ? 'credentials.savedEmail'
    : 'credentials.savedPassword';
}
