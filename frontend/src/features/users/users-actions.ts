// The profile pages' network calls, kept out of the components.
import { apiFetch } from '../../lib/api';
import type { User } from '../auth/auth-types';

/** Another user's profile as `GET /users/:id` returns it: never the email. */
export interface PublicUser {
  username: string;
  profilePicture: string | null;
}

/** The fields `PATCH /users/:id` accepts (`UpdateUserDto`). */
export interface ProfileChanges {
  username?: string;
  firstName?: string;
  lastName?: string;
  profilePicture?: string | null;
  email?: string;
  password?: string;
  currentPassword?: string;
}

/** Saves changes to one's own profile; resolves to the profile as saved. */
export async function updateProfile(
  userId: number,
  changes: ProfileChanges,
): Promise<User> {
  const saved = await apiFetch<User>(`/users/${userId}`, {
    method: 'PATCH',
    body: JSON.stringify(changes),
  });
  if (!saved) {
    throw new Error('PATCH /users/:id answered with no body');
  }
  return saved;
}

/** Reads a profile through `GET /users/:id`. */
export async function fetchPublicUser(id: string): Promise<PublicUser> {
  const user = await apiFetch<PublicUser>(`/users/${encodeURIComponent(id)}`);
  if (!user) {
    throw new Error('GET /users/:id answered with no body');
  }
  return user;
}
