// Unit tests for what the profile forms show and send.
import { describe, expect, it } from 'vitest';
import { fakeUser } from '../../test/fixtures';
import {
  credentialsChanges,
  credentialsSavedKey,
  credentialsValues,
  infoChanges,
  infoValues,
} from './users-changes';

describe('infoChanges', () => {
  it('sends nothing when the trimmed values match the saved profile', () => {
    const values = { ...infoValues(fakeUser), firstName: '  Ada  ' };

    expect(infoChanges(fakeUser, values)).toEqual({});
  });

  it('sends only the changed fields, trimmed', () => {
    const values = { ...infoValues(fakeUser), lastName: ' Byron ' };

    expect(infoChanges(fakeUser, values)).toEqual({ lastName: 'Byron' });
  });

  it('sends an emptied picture as null, which removes it', () => {
    const user = { ...fakeUser, profilePicture: 'https://example.com/a.png' };
    const values = { ...infoValues(user), profilePicture: ' ' };

    expect(infoValues(user).profilePicture).toBe('https://example.com/a.png');
    expect(infoChanges(user, values)).toEqual({ profilePicture: null });
  });
});

describe('credentialsChanges', () => {
  it('starts from the saved email with every password empty', () => {
    expect(credentialsValues(fakeUser)).toEqual({
      email: fakeUser.email,
      password: '',
      confirmPassword: '',
      currentPassword: '',
    });
  });

  it('leaves out an email that only differs in case or spaces', () => {
    const values = {
      ...credentialsValues(fakeUser),
      email: ` ${fakeUser.email.toUpperCase()} `,
    };

    expect(credentialsChanges(fakeUser, values)).toEqual({});
  });

  it('sends a new email lower-cased, and a typed password', () => {
    const values = {
      ...credentialsValues(fakeUser),
      email: 'Ada@Example.org',
      password: 'new-secret-123',
    };

    expect(credentialsChanges(fakeUser, values)).toEqual({
      email: 'ada@example.org',
      password: 'new-secret-123',
    });
  });
});

describe('credentialsSavedKey', () => {
  it.each([
    [{ email: 'a@b.co' }, 'credentials.savedEmail'],
    [{ password: 'x' }, 'credentials.savedPassword'],
    [{ email: 'a@b.co', password: 'x' }, 'credentials.savedBoth'],
  ])('names %o as %s', (changes, key) => {
    expect(credentialsSavedKey(changes)).toBe(key);
  });
});
