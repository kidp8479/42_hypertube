// Spec for the profile forms' own rules: only the changed fields are
// checked, and the new password is optional. The shared field rules are
// covered by the register spec.
import { describe, expect, it } from 'vitest';
import {
  validateCredentials,
  validateInfo,
  type InfoField,
} from './users-validation';

const info = {
  username: 'ada',
  firstName: 'Ada',
  lastName: 'Lovelace',
};

describe('validateInfo', () => {
  it('checks only the fields that changed', () => {
    // A 2-letter username an OAuth login set, outside the register rules.
    const values = { ...info, username: 'ab', lastName: 'Byron' };

    expect(validateInfo(values, new Set<InfoField>(['lastName']))).toEqual({});
    expect(
      validateInfo(values, new Set<InfoField>(['username', 'lastName'])),
    ).toEqual({ username: { code: 'tooShort', min: 3 } });
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
