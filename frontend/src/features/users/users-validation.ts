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

// 500 is the column length. Like the backend's @IsUrl, only https with a
// named host and a TLD of 2 letters or more (`https://localhost/a.png` is
// refused there).
const PICTURE_HOST = /\.[a-z]{2,}$/i;

function validateProfilePicture(url: string): ValidationError | undefined {
  const trimmedUrl = url.trim();
  if (trimmedUrl === '') {
    return undefined;
  }
  if (trimmedUrl.length > 500) {
    return { code: 'tooLong', max: 500 };
  }
  const parsed = URL.parse(trimmedUrl);
  return parsed?.protocol === 'https:' && PICTURE_HOST.test(parsed.hostname)
    ? undefined
    : { code: 'invalidUrl' };
}

// 100 is UpdateUserDto's @MaxLength: a longer one cannot be the password.
function validateCurrentPassword(value: string): ValidationError | undefined {
  if (value === '') {
    return { code: 'required' };
  }
  return value.length > 100 ? { code: 'tooLong', max: 100 } : undefined;
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

/**
 * The information form's rules; an empty object means it may be sent. Only
 * the fields that differ from `saved` are checked, like the backend's partial
 * update: a value an OAuth login set outside the register rules (a 2-letter
 * GitHub login as username) must not block saving another field.
 */
export function validateInfo(
  values: InfoValues,
  saved: InfoValues,
): FieldErrors<InfoField> {
  const checks: Array<[InfoField, ValidationError | undefined]> = [
    ['username', validateUsername(values.username)],
    ['firstName', validateName(values.firstName)],
    ['lastName', validateName(values.lastName)],
    ['profilePicture', validateProfilePicture(values.profilePicture)],
  ];
  return collect(
    checks.filter(([field]) => values[field].trim() !== saved[field]),
  );
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
    ['currentPassword', validateCurrentPassword(values.currentPassword)],
  ]);
}
