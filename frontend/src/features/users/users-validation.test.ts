// Spec for the profile forms' own rules: the picture address and the
// optional new password. The shared field rules are covered by the register
// spec.
import { describe, expect, it } from 'vitest';
import { validateCredentials, validateInfo } from './users-validation';

const info = {
  username: 'ada',
  firstName: 'Ada',
  lastName: 'Lovelace',
  profilePicture: '',
};

describe('validateInfo', () => {
  it('accepts an empty picture (no picture) and an https address', () => {
    expect(validateInfo(info)).toEqual({});
    expect(
      validateInfo({ ...info, profilePicture: 'https://example.com/a.png' }),
    ).toEqual({});
  });

  it('refuses a picture address that is not https or has no TLD', () => {
    for (const profilePicture of [
      'http://example.com/a.png',
      'javascript:alert(1)',
      'not a url',
      'https://localhost/a.png',
      'https://example.c/a.png',
    ]) {
      expect(validateInfo({ ...info, profilePicture })).toEqual({
        profilePicture: { code: 'invalidUrl' },
      });
    }
  });

  it('refuses a picture address longer than the column', () => {
    const profilePicture = `https://example.com/${'a'.repeat(500)}`;

    expect(validateInfo({ ...info, profilePicture })).toEqual({
      profilePicture: { code: 'tooLong', max: 500 },
    });
  });
});

describe('validateCredentials', () => {
  const credentials = {
    email: 'ada@example.com',
    password: '',
    confirmPassword: '',
    currentPassword: 'secret-123',
  };

  it('lets the new password stay empty, but always asks for the current one', () => {
    expect(validateCredentials(credentials)).toEqual({});
    expect(
      validateCredentials({ ...credentials, currentPassword: '' }),
    ).toEqual({ currentPassword: { code: 'required' } });
  });

  it('refuses a current password longer than the backend accepts', () => {
    expect(
      validateCredentials({ ...credentials, currentPassword: 'a'.repeat(101) }),
    ).toEqual({ currentPassword: { code: 'tooLong', max: 100 } });
  });

  it('checks a new password and its confirmation', () => {
    expect(
      validateCredentials({
        ...credentials,
        password: 'short',
        confirmPassword: 'other',
      }),
    ).toEqual({
      password: { code: 'tooShort', min: 8 },
      confirmPassword: { code: 'mismatch' },
    });
  });
});
