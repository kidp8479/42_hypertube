// French strings of the `users` namespace, typed against the English tree.
import type { usersEn } from './users-locale-en';

export const usersFr: typeof usersEn = {
  profile: {
    title: 'Mon profil',
    language:
      "Votre langue est celle choisie dans l'en-tête : elle est enregistrée sur votre compte.",
  },
  info: {
    title: 'Informations',
    pictureHint:
      'Une adresse d’image en https://. Laissez vide pour afficher votre initiale.',
    submit: 'Enregistrer',
    submitting: 'Enregistrement...',
    saved: 'Profil enregistré.',
    usernameTaken: "Ce nom d'utilisateur est déjà pris.",
  },
  credentials: {
    title: 'E-mail et mot de passe',
    intro: "Modifier l'un des deux vous déconnecte de vos autres appareils.",
    newPassword: 'Nouveau mot de passe',
    newPasswordHint: "Laissez vide pour garder l'actuel.",
    submit: 'Mettre à jour',
    submitting: 'Mise à jour...',
    saved: 'E-mail et mot de passe mis à jour.',
    nothingToChange:
      "Modifiez d'abord l'e-mail ou saisissez un nouveau mot de passe.",
    wrongPassword: 'Le mot de passe actuel est incorrect.',
    emailTaken: 'Cette adresse e-mail est déjà utilisée par un autre compte.',
    noPassword:
      "Ce compte n'a pas encore de mot de passe (il a été créé avec 42 ou GitHub) : son e-mail et son mot de passe ne peuvent pas être modifiés ici.",
  },
  publicProfile: {
    loading: 'Chargement du profil...',
  },
  errors: {
    generic: 'Une erreur est survenue. Veuillez réessayer.',
  },
};
