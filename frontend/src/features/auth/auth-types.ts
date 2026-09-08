// Shared data shapes for the auth feature.

/** Serialised shape of `GET /users/me` and friends - the backend excludes `password` at the entity level. */
export interface User {
  id: number;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  profilePicture: string | null;
  preferredLanguage: 'en' | 'fr';
  createdAt: string; // Date -> JSON = string ISO
  updatedAt: string;
}
