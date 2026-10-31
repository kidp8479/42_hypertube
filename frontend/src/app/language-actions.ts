// The language switch's network call, kept out of the component.
import { apiFetch } from '../lib/api';
import type { SupportedLanguage } from '../lib/languages';
import type { User } from '../features/auth/auth-types';

/**
 * Saves the language on the account (`PATCH /users/:id`), so it follows the
 * user to another device. Resolves to the profile as saved.
 */
export function savePreferredLanguage(
  userId: number,
  language: SupportedLanguage,
): Promise<User | undefined> {
  return apiFetch<User>(`/users/${userId}`, {
    method: 'PATCH',
    body: JSON.stringify({ preferredLanguage: language }),
  });
}
