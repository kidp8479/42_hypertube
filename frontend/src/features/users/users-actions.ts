// The profile pages' network calls, kept out of the components.
import { apiFetch } from '../../lib/api';
import type { User } from '../auth/auth-types';

/** Another user's profile as `GET /users/:id` returns it: never the email. */
export interface PublicUser {
  id: number;
  username: string;
  profilePicture: string | null;
}

/** The fields `PATCH /users/:id` accepts (`UpdateUserDto`). */
export interface ProfileChanges {
  username?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  password?: string;
  currentPassword?: string;
}

/** Saves changes to one's own profile; resolves to the profile as saved. */
export async function updateProfile(
  userId: number,
  changes: ProfileChanges,
): Promise<User> {
  return savedProfile(
    await apiFetch<User>(`/users/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify(changes),
    }),
  );
}

/** Uploads one's own picture (`PUT /users/:id/picture`); resolves to the profile as saved. */
export async function uploadPicture(userId: number, file: File): Promise<User> {
  const body = new FormData();
  body.append('picture', file);
  return savedProfile(
    await apiFetch<User>(`/users/${userId}/picture`, { method: 'PUT', body }),
  );
}

/** Back to the default avatar (`DELETE /users/:id/picture`). */
export async function removePicture(userId: number): Promise<User> {
  return savedProfile(
    await apiFetch<User>(`/users/${userId}/picture`, { method: 'DELETE' }),
  );
}

function savedProfile(user: User | undefined): User {
  if (!user) {
    throw new Error('the profile write answered with no body');
  }
  return user;
}

/** Reads a profile through `GET /users/:id`. */
export async function fetchPublicUser(id: string): Promise<PublicUser> {
  const user = await apiFetch<PublicUser>(`/users/${encodeURIComponent(id)}`);
  if (!user) {
    throw new Error('GET /users/:id answered with no body');
  }
  return user;
}
