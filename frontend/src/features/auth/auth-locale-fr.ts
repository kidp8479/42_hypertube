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
  errors: {
    generic: 'Une erreur est survenue. Veuillez réessayer.',
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
  },
  login: {
    title: 'Connexion',
    submit: 'Se connecter',
    submitting: 'Connexion...',
    registeredNotice: 'Compte créé. Veuillez vous connecter.',
    badCredentials: 'E-mail ou mot de passe invalide.',
    forgotPassword: 'Mot de passe oublié ?',
    createAccount: 'Créer un compte',
  },
  home: {
    signedIn: 'Connecté en tant que <strong>{{username}}</strong> ({{email}})',
    logout: 'Se déconnecter',
  },
  oauth: {
    continueWith: 'Continuer avec {{provider}}',
  },
  oauthCallback: {
    title: 'Connexion',
    signingIn: 'Connexion en cours...',
    backToLogin: 'Retour à la connexion',
    errors: {
      cancelled: 'La connexion a été annulée.',
      email_unverified:
        'Votre compte GitHub n’a aucune adresse e-mail vérifiée. Vérifiez-en une sur GitHub, puis réessayez.',
      expired: 'Ce lien de connexion a expiré. Veuillez réessayer.',
      failed: 'La connexion a échoué. Veuillez réessayer.',
    },
  },
};
