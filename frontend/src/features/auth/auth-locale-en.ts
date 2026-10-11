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
  errors: {
    generic: 'Something went wrong. Please try again.',
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
  },
  login: {
    title: 'Log in',
    submit: 'Log in',
    submitting: 'Logging in...',
    registeredNotice: 'Account created. Please sign in.',
    badCredentials: 'Invalid email or password.',
    noAccount: 'No account yet?',
    register: 'Register',
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
    backToLogin: 'Back to log in',
    errors: {
      cancelled: 'Sign-in was cancelled.',
      email_unverified:
        'Your GitHub account has no verified email address. Verify one on GitHub, then try again.',
      expired: 'This sign-in link has expired. Please try again.',
      failed: 'Sign-in failed. Please try again.',
    },
  },
};
