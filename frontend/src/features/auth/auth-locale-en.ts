// English strings of the `auth` namespace (source of truth: `fr` must mirror
// these keys, see auth-locale-fr.ts).
export const authEn = {
  fields: {
    email: 'Email',
    password: 'Password',
    confirmPassword: 'Confirm password',
    username: 'Username',
    identifier: 'Username or email',
    firstName: 'First name',
    lastName: 'Last name',
  },
  hints: {
    username: '3 to 30 characters, no @',
    password: '8 to 100 characters',
  },
  placeholders: {
    email: 'ada@example.com',
  },
  errors: {
    generic: 'Something went wrong. Please try again.',
  },
  validation: {
    required: '{{field}} is required',
    invalidEmail: 'Invalid email address',
    tooShort: '{{field}} must be at least {{min}} characters long',
    tooLong: '{{field}} must be at most {{max}} characters long',
    mismatch: 'Passwords do not match',
    containsAt: '{{field}} cannot contain @',
  },
  register: {
    title: 'Create your account',
    submit: 'Register',
    submitting: 'Registering...',
    hasAccount: 'Already have an account?',
    logIn: 'Sign in',
    conflict: 'An account with this email or username already exists.',
  },
  login: {
    title: 'Sign in',
    submit: 'Sign in',
    submitting: 'Signing in...',
    registeredNotice: 'Account created. Please sign in.',
    badCredentials: 'Invalid username, email or password.',
    forgotPassword: 'Forgot password?',
    createAccount: 'Create an account',
  },
  home: {
    signedIn: 'Signed in as <strong>{{username}}</strong> ({{email}})',
    logout: 'Log out',
  },
  oauth: {
    continueWith: 'Continue with {{provider}}',
  },
  oauthCallback: {
    title: 'Sign in',
    signingIn: 'Signing you in...',
    backToLogin: 'Back to sign in',
    errors: {
      cancelled: 'Sign-in was cancelled.',
      email_unverified:
        'Your GitHub account has no verified email address. Verify one on GitHub, then try again.',
      expired: 'This sign-in link has expired. Please try again.',
      failed: 'Sign-in failed. Please try again.',
    },
  },
};
