// The language switch's network call, kept out of the component.
import { apiFetch } from '../lib/api';
import type { SupportedLanguage } from '../lib/i18n';

/** Saves the language on the account (`PATCH /users/:id`), so it follows the user to another device. */
export async function savePreferredLanguage(
  userId: number,
  language: SupportedLanguage,
): Promise<void> {
  await apiFetch(`/users/${userId}`, {
    method: 'PATCH',
    body: JSON.stringify({ preferredLanguage: language }),
  });
}
