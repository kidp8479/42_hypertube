// French strings of the `auth` namespace. Typed against the English tree so
// a key missing here is a compile error, not a runtime fallback to English.
import type { authEn } from './auth-locale-en';

export const authFr: typeof authEn = {
  fields: {
    email: 'E-mail',
    password: 'Mot de passe',
    confirmPassword: 'Confirmer le mot de passe',
    username: 'Nom d’utilisateur',
    identifier: 'Nom d’utilisateur ou e-mail',
    firstName: 'Prénom',
    lastName: 'Nom',
    currentPassword: 'Mot de passe actuel',
    profilePicture: 'Photo de profil',
  },
  hints: {
    username: '3 à 30 caractères, sans @',
    password: '8 à 100 caractères',
    picture: 'Facultatif. JPEG, PNG ou WebP, 2 Mo au plus.',
  },
  picture: {
    choose: 'Choisir une photo',
    empty: 'Aucune photo choisie',
  },
  placeholders: {
    email: 'ada@example.com',
  },
  validation: {
    required: 'Le champ « {{field}} » est obligatoire',
    invalidEmail: 'Adresse e-mail invalide',
    tooShort:
      'Le champ « {{field}} » doit contenir au moins {{min}} caractères',
    tooLong: 'Le champ « {{field}} » doit contenir au plus {{max}} caractères',
    mismatch: 'Les mots de passe ne correspondent pas',
    containsAt: 'Le champ « {{field}} » ne peut pas contenir @',
    notAnImage: 'Choisissez une image JPEG, PNG ou WebP',
    fileTooLarge: 'La photo doit faire {{max}} Mo au plus',
  },
  register: {
    title: 'Créer votre compte',
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
    badCredentials: 'Nom d’utilisateur, e-mail ou mot de passe invalide.',
    forgotPassword: 'Mot de passe oublié ?',
    createAccount: 'Créer un compte',
  },
  home: {
    signedIn: 'Connecté en tant que <strong>{{username}}</strong> ({{email}})',
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
