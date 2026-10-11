import type { TFunction } from 'i18next';

export type RegisterField =
  | 'email'
  | 'password'
  | 'confirmPassword'
  | 'username'
  | 'firstName'
  | 'lastName';
export type RegisterValues = Record<RegisterField, string>;

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
  | { code: 'mismatch' };
export type RegisterErrors = Partial<Record<RegisterField, ValidationError>>;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateEmail(email: string): ValidationError | undefined {
  const trimmedEmail = email.trim();
  if (trimmedEmail === '') {
    return { code: 'required' };
  }
  if (trimmedEmail.length > 255) {
    return { code: 'tooLong', max: 255 };
  }
  if (!EMAIL_REGEX.test(trimmedEmail)) {
    return { code: 'invalidEmail' };
  }
  return undefined;
}

function validateUsername(username: string): ValidationError | undefined {
  const trimmedUsername = username.trim();
  if (trimmedUsername === '') {
    return { code: 'required' };
  }
  if (trimmedUsername.length < 3) {
    return { code: 'tooShort', min: 3 };
  }
  if (trimmedUsername.length > 30) {
    return { code: 'tooLong', max: 30 };
  }
  return undefined;
}

function validateName(value: string): ValidationError | undefined {
  const trimmedValue = value.trim();
  if (trimmedValue === '') {
    return { code: 'required' };
  }
  if (trimmedValue.length > 100) {
    return { code: 'tooLong', max: 100 };
  }
  return undefined;
}

function validatePassword(password: string): ValidationError | undefined {
  if (password.length < 8) {
    return { code: 'tooShort', min: 8 };
  }
  if (password.length > 100) {
    return { code: 'tooLong', max: 100 };
  }
  return undefined;
}

function validateConfirmPassword(
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

export function validateRegister(values: RegisterValues): RegisterErrors {
  const errors: RegisterErrors = {};

  const rules: Array<{
    field: RegisterField;
    error: ValidationError | undefined;
  }> = [
    { field: 'email', error: validateEmail(values.email) },
    { field: 'username', error: validateUsername(values.username) },
    { field: 'firstName', error: validateName(values.firstName) },
    { field: 'lastName', error: validateName(values.lastName) },
    { field: 'password', error: validatePassword(values.password) },
    {
      field: 'confirmPassword',
      error: validateConfirmPassword(values.password, values.confirmPassword),
    },
  ];

  for (const rule of rules) {
    if (rule.error) {
      errors[rule.field] = rule.error;
    }
  }

  return errors;
}

/**
 * Localised rendering of a {@link ValidationError}. The single place the UI
 * turns an error code into text; `t` is passed in (from `useTranslation`) so
 * the caller re-renders when the language changes.
 */
export function describeValidationError(
  field: RegisterField,
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
    case 'mismatch':
      return t('validation.mismatch');
  }
}
