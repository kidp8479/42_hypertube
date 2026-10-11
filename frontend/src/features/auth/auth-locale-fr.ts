// French strings of the `auth` namespace. Typed against the English tree so
// a key missing here is a compile error, not a runtime fallback to English.
import type { authEn } from './auth-locale-en';

export const authFr: typeof authEn = {
  fields: {
    email: 'E-mail',
    password: 'Mot de passe',
    confirmPassword: 'Confirmer le mot de passe',
    username: 'Nom d’utilisateur',
    firstName: 'Prénom',
    lastName: 'Nom',
  },
  validation: {
    required: 'Le champ « {{field}} » est obligatoire',
    invalidEmail: 'Adresse e-mail invalide',
    tooShort:
      'Le champ « {{field}} » doit contenir au moins {{min}} caractères',
    tooLong: 'Le champ « {{field}} » doit contenir au plus {{max}} caractères',
    mismatch: 'Les mots de passe ne correspondent pas',
  },
  register: {
    title: 'Inscription',
    submit: 'S’inscrire',
    submitting: 'Inscription...',
    hasAccount: 'Vous avez déjà un compte ?',
    logIn: 'Se connecter',
    conflict: 'Un compte existe déjà avec cet e-mail ou ce nom d’utilisateur.',
    generic: 'Une erreur est survenue. Veuillez réessayer.',
  },
};
