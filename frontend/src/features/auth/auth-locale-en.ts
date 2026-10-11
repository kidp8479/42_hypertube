// English strings of the `auth` namespace (source of truth: `fr` must mirror
// these keys, see auth-locale-fr.ts).
export const authEn = {
  fields: {
    email: 'Email',
    password: 'Password',
    confirmPassword: 'Confirm password',
    username: 'Username',
    firstName: 'First name',
    lastName: 'Last name',
  },
  validation: {
    required: '{{field}} is required',
    invalidEmail: 'Invalid email address',
    tooShort: '{{field}} must be at least {{min}} characters long',
    tooLong: '{{field}} must be at most {{max}} characters long',
    mismatch: 'Passwords do not match',
  },
  register: {
    title: 'Register',
    submit: 'Register',
    submitting: 'Registering...',
    hasAccount: 'Already have an account?',
    logIn: 'Log in',
    conflict: 'An account with this email or username already exists.',
    generic: 'Something went wrong. Please try again.',
  },
};
