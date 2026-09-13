export type RegisterField =
  | 'email'
  | 'password'
  | 'confirmPassword'
  | 'username'
  | 'firstName'
  | 'lastName';
export type RegisterErrors = Partial<Record<RegisterField, string>>;
export type RegisterValues = Record<RegisterField, string>;

function validateEmail(email: string): string | undefined {
  const trimmedEmail = email.trim();
  if (trimmedEmail === '') {
    return 'Email is required';
  }
  if (trimmedEmail.length > 255) {
    return 'Email must be at most 255 characters long';
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmedEmail)) {
    return 'Invalid email address';
  }
  return undefined;
}

function validateUsername(username: string): string | undefined {
  const trimmedUsername = username.trim();
  if (trimmedUsername === '') {
    return 'User name is required';
  }
  if (trimmedUsername.length < 3) {
    return 'User name must be at least 3 characters long';
  }
  if (trimmedUsername.length > 30) {
    return 'User name must be at most 30 characters long';
  }
  return undefined;
}

function validateName(value: string, label: string): string | undefined {
  const trimmedValue = value.trim();
  if (trimmedValue === '') {
    return `${label} is required`;
  }
  if (trimmedValue.length > 100) {
    return `${label} must be at most 100 characters long`;
  }
  return undefined;
}

function validatePassword(password: string): string | undefined {
  if (password.length < 8) {
    return 'Password must be at least 8 characters long';
  }
  if (password.length > 100) {
    return 'Password must be at most 100 characters long';
  }
  return undefined;
}

function validateConfirmPassword(
  password: string,
  confirmPassword: string,
): string | undefined {
  if (confirmPassword.trim() === '') {
    return 'Confirm Password is required';
  }
  if (confirmPassword !== password) {
    return 'Passwords do not match';
  }
  return undefined;
}

export function validateRegister(values: RegisterValues): RegisterErrors {
  const errors: RegisterErrors = {};

  const rules: Array<{ field: RegisterField; error: string | undefined }> = [
    { field: 'email', error: validateEmail(values.email) },
    { field: 'username', error: validateUsername(values.username) },
    { field: 'firstName', error: validateName(values.firstName, 'First Name') },
    { field: 'lastName', error: validateName(values.lastName, 'Last Name') },
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
