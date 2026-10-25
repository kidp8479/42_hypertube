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
  it('checks only the fields that changed', () => {
    const saved = { ...info, username: 'ab' };
    const picture = 'https://example.com/a.png';

    expect(validateInfo({ ...saved, profilePicture: picture }, saved)).toEqual(
      {},
    );
  });

  it('accepts an emptied picture (it removes the picture)', () => {
    const saved = { ...info, profilePicture: 'https://example.com/a.png' };

    expect(validateInfo({ ...saved, profilePicture: '' }, saved)).toEqual({});
  });

  it('accepts the picture addresses @IsUrl accepts', () => {
    for (const profilePicture of [
      'https://example.com:8080/a.png',
      'https://example.com/a%20b.png',
      'https://bücher.example/a.png',
    ]) {
      expect(validateInfo({ ...info, profilePicture }, info)).toEqual({});
    }
  });

  it('refuses a picture address that @IsUrl would refuse', () => {
    for (const profilePicture of [
      'http://example.com/a.png',
      'javascript:alert(1)',
      'not a url',
      'https://localhost/a.png',
      'https://example.c/a.png',
      'https://example.com/my photo.png',
      'https://my_host.example.com/a.png',
      'https://a..com/a.png',
      'https://-a.example.com/a.png',
    ]) {
      expect(validateInfo({ ...info, profilePicture }, info)).toEqual({
        profilePicture: { code: 'invalidUrl' },
      });
    }
  });

  it('checks the picture on a browser without URL.parse (before Chrome 126)', () => {
    // Shadowed, not deleted: jsdom's URL inherits `parse` from Node's.
    Object.defineProperty(URL, 'parse', {
      value: undefined,
      configurable: true,
    });
    try {
      const valid = { ...info, profilePicture: 'https://example.com/a.png' };
      const invalid = { ...info, profilePicture: 'not a url' };

      expect(validateInfo(valid, info)).toEqual({});
      expect(validateInfo(invalid, info)).toEqual({
        profilePicture: { code: 'invalidUrl' },
      });
    } finally {
      Reflect.deleteProperty(URL, 'parse');
    }
  });

  it('refuses a picture address longer than the column', () => {
    const profilePicture = `https://example.com/${'a'.repeat(500)}`;

    expect(validateInfo({ ...info, profilePicture }, info)).toEqual({
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
