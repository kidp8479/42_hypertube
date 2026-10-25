// Spec for authReducer's `user-updated`: a saved profile edit replaces the
// signed-in user, and never signs anyone back in.
import { describe, expect, it } from 'vitest';
import { fakeUser } from '../../test/fixtures';
import { authReducer } from './auth-reducer';

const edited = { ...fakeUser, firstName: 'Augusta' };

describe('authReducer user-updated', () => {
  it('replaces the user while signed in', () => {
    const state = authReducer(
      { status: 'authenticated', user: fakeUser },
      { type: 'user-updated', user: edited },
    );

    expect(state).toEqual({ status: 'authenticated', user: edited });
  });

  it('is ignored once signed out: a late save does not sign back in', () => {
    const anonymous = { status: 'anonymous' as const, user: null };

    expect(authReducer(anonymous, { type: 'user-updated', user: edited })).toBe(
      anonymous,
    );
  });
});
