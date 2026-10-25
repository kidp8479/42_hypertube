// Shared test fixtures. Keeping the canonical `User` and auth context here
// means a change to either contract is a one-line edit, not a hunt across
// every spec.
import { vi } from 'vitest';
import type { AuthContextValue } from '../features/auth/auth-context';
import type { AuthState } from '../features/auth/auth-reducer';
import type { User } from '../features/auth/auth-types';

export const fakeUser: User = {
  id: 1,
  email: 'ada@example.com',
  username: 'ada',
  firstName: 'Ada',
  lastName: 'Lovelace',
  profilePicture: null,
  preferredLanguage: 'en',
  createdAt: '2020-01-01T00:00:00.000Z',
  updatedAt: '2020-01-01T00:00:00.000Z',
};

/**
 * What `useAuth()` returns in a spec: `state` plus a mock for every action,
 * `overrides` replacing the ones the spec asserts on.
 */
export function fakeAuth(
  state: AuthState,
  overrides: Partial<AuthContextValue> = {},
): AuthContextValue {
  return {
    state,
    login: vi.fn(),
    loginWithOAuthCode: vi.fn(),
    logout: vi.fn(),
    updateUser: vi.fn(),
    ...overrides,
  };
}
