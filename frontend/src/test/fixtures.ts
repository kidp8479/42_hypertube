// Shared test fixtures. Keeping the canonical `User` here means a change to
// the `User` contract is a one-line edit, not a hunt across every auth spec.
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
