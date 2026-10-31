// Client-side rules for the account forms (register here, the profile page
// reuses the field rules). They only save a round trip: the backend DTOs
// (CreateUserDto, UpdateUserDto) stay the authority.
import type { TFunction } from 'i18next';

// Mirrors of CreateUserDto's @Length / @MaxLength: change them together.
export const EMAIL_MAX_LENGTH = 255;
export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 30;
export const NAME_MAX_LENGTH = 100;
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 100;
// Mirrors of the backend's picture rules (ProfilePictureStore).
export const PICTURE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const PICTURE_MAX_MB = 2;

export type RegisterField =
  | 'email'
  | 'password'
  | 'confirmPassword'
  | 'username'
  | 'firstName'
  | 'lastName';
export type RegisterValues = Record<RegisterField, string>;
/** Every account field a message can name: the register ones and the profile ones. */
export type AccountField = RegisterField | 'currentPassword' | 'profilePicture';

/**
 * Why a field failed: a code plus the parameters a message needs, never a
 * rendered sentence. Keeps the rules language-agnostic so the UI can
 * localise the message (react-i18next, HYP-56) without touching them.
 */
export type ValidationError =
  | { code: 'required' }
  | { code: 'invalidEmail' }
  | { code: 'tooShort'; min: number }
  | { code: 'tooLong'; max: number }
  | { code: 'mismatch' }
  | { code: 'containsAt' }
  | { code: 'notAnImage' }
  | { code: 'fileTooLarge'; maxMb: number };
export type FieldErrors<F extends AccountField> = Partial<
  Record<F, ValidationError>
>;

// Deliberately loose (something@something.tld, a TLD of 2 characters or
// more like @IsEmail asks): a stricter pattern would reject valid addresses,
// and the backend's @IsEmail has the final say.
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@.]{2,}$/;

export function validateEmail(email: string): ValidationError | undefined {
  const trimmedEmail = email.trim();
  if (trimmedEmail === '') {
    return { code: 'required' };
  }
  if (trimmedEmail.length > EMAIL_MAX_LENGTH) {
    return { code: 'tooLong', max: EMAIL_MAX_LENGTH };
  }
  if (!EMAIL_REGEX.test(trimmedEmail)) {
    return { code: 'invalidEmail' };
  }
  return undefined;
}

export function validateUsername(
  username: string,
): ValidationError | undefined {
  const trimmedUsername = username.trim();
  if (trimmedUsername === '') {
    return { code: 'required' };
  }
  if (trimmedUsername.length < USERNAME_MIN_LENGTH) {
    return { code: 'tooShort', min: USERNAME_MIN_LENGTH };
  }
  if (trimmedUsername.length > USERNAME_MAX_LENGTH) {
    return { code: 'tooLong', max: USERNAME_MAX_LENGTH };
  }
  // The login field reads a value with @ as an email.
  if (trimmedUsername.includes('@')) {
    return { code: 'containsAt' };
  }
  return undefined;
}

export function validateName(value: string): ValidationError | undefined {
  const trimmedValue = value.trim();
  if (trimmedValue === '') {
    return { code: 'required' };
  }
  if (trimmedValue.length > NAME_MAX_LENGTH) {
    return { code: 'tooLong', max: NAME_MAX_LENGTH };
  }
  return undefined;
}

export function validatePassword(
  password: string,
): ValidationError | undefined {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return { code: 'tooShort', min: PASSWORD_MIN_LENGTH };
  }
  if (password.length > PASSWORD_MAX_LENGTH) {
    return { code: 'tooLong', max: PASSWORD_MAX_LENGTH };
  }
  return undefined;
}

export function validateConfirmPassword(
  password: string,
  confirmPassword: string,
): ValidationError | undefined {
  if (confirmPassword.trim() === '') {
    return { code: 'required' };
  }
  if (confirmPassword !== password) {
    return { code: 'mismatch' };
  }
  return undefined;
}

/**
 * A picked picture's type and size. The type is the browser's guess from the
 * file name; the backend reads the file's bytes and has the final say.
 */
export function validatePicture(file: File): ValidationError | undefined {
  if (!PICTURE_TYPES.includes(file.type)) {
    return { code: 'notAnImage' };
  }
  return file.size > PICTURE_MAX_MB * 1024 * 1024
    ? { code: 'fileTooLarge', maxMb: PICTURE_MAX_MB }
    : undefined;
}

/** Keeps the failed checks of a form, keyed by field. */
export function collectErrors<F extends AccountField>(
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
 * Runs every register-form rule; an empty object means the form may be sent.
 * Values are checked trimmed, as `registerRequest` sends them.
 */
export function validateRegister(
  values: RegisterValues,
): FieldErrors<RegisterField> {
  return collectErrors<RegisterField>([
    ['email', validateEmail(values.email)],
    ['username', validateUsername(values.username)],
    ['firstName', validateName(values.firstName)],
    ['lastName', validateName(values.lastName)],
    ['password', validatePassword(values.password)],
    [
      'confirmPassword',
      validateConfirmPassword(values.password, values.confirmPassword),
    ],
  ]);
}

/**
 * Localised rendering of a {@link ValidationError}. The single place the UI
 * turns an error code into text; `t` is passed in (from `useTranslation`) so
 * the caller re-renders when the language changes.
 */
export function describeValidationError(
  field: AccountField,
  error: ValidationError,
  t: TFunction<'auth'>,
): string {
  const fieldLabel = t(`fields.${field}`);
  switch (error.code) {
    case 'required':
      return t('validation.required', { field: fieldLabel });
    case 'invalidEmail':
      return t('validation.invalidEmail');
    case 'tooShort':
      return t('validation.tooShort', { field: fieldLabel, min: error.min });
    case 'tooLong':
      return t('validation.tooLong', { field: fieldLabel, max: error.max });
    case 'containsAt':
      return t('validation.containsAt', { field: fieldLabel });
    case 'mismatch':
      return t('validation.mismatch');
    case 'notAnImage':
      return t('validation.notAnImage');
    case 'fileTooLarge':
      return t('validation.fileTooLarge', { max: error.maxMb });
  }
}
