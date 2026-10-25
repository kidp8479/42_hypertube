// Client-side rules for the two profile forms, built from the register rules
// so a field is checked the same way everywhere. UpdateUserDto stays the
// authority.
import {
  validateConfirmPassword,
  validateEmail,
  validateName,
  validatePassword,
  validateUsername,
  type AccountField,
  type ValidationError,
} from '../auth/auth-validation';

export type InfoField =
  'username' | 'firstName' | 'lastName' | 'profilePicture';
export type InfoValues = Record<InfoField, string>;

export type CredentialsField =
  'email' | 'password' | 'confirmPassword' | 'currentPassword';
export type CredentialsValues = Record<CredentialsField, string>;

export type FieldErrors<F extends AccountField> = Partial<
  Record<F, ValidationError>
>;

// 500 is the column length; the backend also refuses anything but https.
function validateProfilePicture(url: string): ValidationError | undefined {
  const trimmedUrl = url.trim();
  if (trimmedUrl === '') {
    return undefined;
  }
  if (trimmedUrl.length > 500) {
    return { code: 'tooLong', max: 500 };
  }
  return URL.canParse(trimmedUrl) && new URL(trimmedUrl).protocol === 'https:'
    ? undefined
    : { code: 'invalidUrl' };
}

function collect<F extends AccountField>(
  checks: Array<[F, ValidationError | undefined]>,
): FieldErrors<F> {
  const errors: FieldErrors<F> = {};
  for (const [field, error] of checks) {
    if (error) {
      errors[field] = error;
    }
  }
  return errors;
}

/** The information form's rules; an empty object means it may be sent. */
export function validateInfo(values: InfoValues): FieldErrors<InfoField> {
  return collect<InfoField>([
    ['username', validateUsername(values.username)],
    ['firstName', validateName(values.firstName)],
    ['lastName', validateName(values.lastName)],
    ['profilePicture', validateProfilePicture(values.profilePicture)],
  ]);
}

/**
 * The email and password form's rules. The new password is optional (empty
 * keeps the current one), the current password never is.
 */
export function validateCredentials(
  values: CredentialsValues,
): FieldErrors<CredentialsField> {
  const changingPassword = values.password !== '';
  return collect<CredentialsField>([
    ['email', validateEmail(values.email)],
    [
      'password',
      changingPassword ? validatePassword(values.password) : undefined,
    ],
    [
      'confirmPassword',
      changingPassword
        ? validateConfirmPassword(values.password, values.confirmPassword)
        : undefined,
    ],
    [
      'currentPassword',
      values.currentPassword === '' ? { code: 'required' } : undefined,
    ],
  ]);
}
