// French strings of the `auth` namespace. Typed against the English tree so
// a key missing here is a compile error, not a runtime fallback to English.
import type { authEn } from './auth-locale-en';

export const authFr: typeof authEn = {
  register: {
    conflict: 'Un compte existe déjà avec cet e-mail ou ce nom d’utilisateur.',
    generic: 'Une erreur est survenue. Veuillez réessayer.',
  },
};
