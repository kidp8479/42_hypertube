// Client-side rules for the two profile forms, built from the register rules
// so a field is checked the same way everywhere. UpdateUserDto stays the
// authority.
import {
  PASSWORD_MAX_LENGTH,
  collectErrors,
  validateConfirmPassword,
  validateEmail,
  validateName,
  validatePassword,
  validateUsername,
  type FieldErrors,
  type ValidationError,
} from '../auth/auth-validation';

export type InfoField =
  'username' | 'firstName' | 'lastName' | 'profilePicture';
export type InfoValues = Record<InfoField, string>;

export type CredentialsField =
  'email' | 'password' | 'confirmPassword' | 'currentPassword';
export type CredentialsValues = Record<CredentialsField, string>;

// UpdateUserDto's @MaxLength, the column length.
const PROFILE_PICTURE_MAX_LENGTH = 500;

// Like the backend's @IsUrl: https only, no
// whitespace, and a host made of letter, digit and hyphen labels that ends in
// a TLD of 2 letters or more (`https://localhost/a.png` and
// `https://my_host.example.com/a.png` are refused there).
const HOST_LABEL = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/i;
const TLD = /^([a-z]{2,}|xn--[a-z0-9-]+)$/i;

function isPictureHost(hostname: string): boolean {
  const labels = hostname.split('.');
  return (
    labels.length > 1 &&
    labels.every((label) => HOST_LABEL.test(label)) &&
    TLD.test(labels[labels.length - 1])
  );
}

// `new URL` rather than the static `URL.parse`, which only exists from
// Chrome 126 and is below the supported floor (Chrome 111).
function parseUrl(value: string): URL | null {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

function validateProfilePicture(url: string): ValidationError | undefined {
  const trimmedUrl = url.trim();
  if (trimmedUrl === '') {
    return undefined;
  }
  if (trimmedUrl.length > PROFILE_PICTURE_MAX_LENGTH) {
    return { code: 'tooLong', max: PROFILE_PICTURE_MAX_LENGTH };
  }
  const parsed = /\s/.test(trimmedUrl) ? null : parseUrl(trimmedUrl);
  return parsed?.protocol === 'https:' && isPictureHost(parsed.hostname)
    ? undefined
    : { code: 'invalidUrl' };
}

// UpdateUserDto caps it like a new password: a longer one cannot be it.
function validateCurrentPassword(value: string): ValidationError | undefined {
  if (value === '') {
    return { code: 'required' };
  }
  return value.length > PASSWORD_MAX_LENGTH
    ? { code: 'tooLong', max: PASSWORD_MAX_LENGTH }
    : undefined;
}

/**
 * The information form's rules; an empty object means it may be sent. Only
 * the `changed` fields are checked, like the backend's partial update: a
 * value an OAuth login set outside the register rules (a 2-letter GitHub
 * login as username) must not block saving another field.
 */
export function validateInfo(
  values: InfoValues,
  changed: ReadonlySet<InfoField>,
): FieldErrors<InfoField> {
  const checks: Array<[InfoField, ValidationError | undefined]> = [
    ['username', validateUsername(values.username)],
    ['firstName', validateName(values.firstName)],
    ['lastName', validateName(values.lastName)],
    ['profilePicture', validateProfilePicture(values.profilePicture)],
  ];
  return collectErrors(checks.filter(([field]) => changed.has(field)));
}

/**
 * The email and password form's rules. The new password is optional (empty
 * keeps the current one), the current password never is.
 */
export function validateCredentials(
  values: CredentialsValues,
): FieldErrors<CredentialsField> {
  const changingPassword = values.password !== '';
  return collectErrors<CredentialsField>([
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
