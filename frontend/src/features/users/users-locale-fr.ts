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
    submit: 'Enregistrer',
    submitting: 'Enregistrement...',
    saved: 'Profil enregistré.',
    usernameTaken: "Ce nom d'utilisateur est déjà pris.",
  },
  picture: {
    title: 'Photo',
    hint: 'JPEG, PNG ou WebP, 2 Mo au plus. Sans photo, votre initiale est affichée.',
    upload: 'Envoyer',
    uploading: 'Envoi...',
    remove: 'Retirer la photo',
    saved: 'Photo mise à jour.',
    removed: 'Photo retirée.',
    refused: "Ce fichier n'est pas une image JPEG, PNG ou WebP.",
    tooLarge: 'La photo dépasse 2 Mo.',
  },
  credentials: {
    title: 'E-mail et mot de passe',
    intro: "Modifier l'un des deux vous déconnecte de vos autres appareils.",
    newPassword: 'Nouveau mot de passe',
    newPasswordHint: "Laissez vide pour garder l'actuel.",
    submit: 'Mettre à jour',
    submitting: 'Mise à jour...',
    savedEmail: 'E-mail mis à jour.',
    savedPassword: 'Mot de passe mis à jour.',
    savedBoth: 'E-mail et mot de passe mis à jour.',
    nothingToChange:
      "Modifiez d'abord l'e-mail ou saisissez un nouveau mot de passe.",
    wrongPassword: 'Le mot de passe actuel est incorrect.',
    emailTaken: 'Cette adresse e-mail est déjà utilisée par un autre compte.',
    noPassword:
      "La modification a été refusée. Vérifiez l'adresse e-mail. Si ce compte a été créé avec 42 ou GitHub, il n'a pas encore de mot de passe : son e-mail et son mot de passe ne peuvent pas être modifiés ici.",
  },
};
