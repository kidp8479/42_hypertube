// French strings of the `apiKeys` namespace, typed against the English tree.
import type { apiKeysEn } from './api-keys-locale-en';

export const apiKeysFr: typeof apiKeysEn = {
  title: 'Clés d’API',
  intro:
    'Une clé permet à un script d’utiliser l’API en votre nom. Envoyez son client et son secret à POST /api/oauth/token, puis utilisez l’access_token reçu comme jeton bearer.',
  name: {
    label: 'Nom de la clé',
    hint: 'Pour distinguer vos clés, 50 caractères au plus.',
    required: 'Donnez un nom à la clé',
    tooLong: 'Le nom doit faire au plus {{max}} caractères',
  },
  create: {
    submit: 'Créer une clé',
    submitting: 'Création...',
    tooMany: 'Vous avez déjà 5 clés : révoquez-en une d’abord.',
  },
  created: {
    title: 'Copiez le secret maintenant',
    warning:
      'Il ne sera plus affiché. Perdu ? Révoquez cette clé et créez-en une autre.',
    client: 'Client',
    secret: 'Secret',
    copy: 'Copier le secret',
    copied: 'Secret copié.',
    copyFailed:
      'La copie a échoué : sélectionnez le secret et copiez-le à la main.',
    done: 'C’est fait, je l’ai copié',
  },
  list: {
    label: 'Vos clés',
    empty: 'Aucune clé d’API pour l’instant.',
    createdOn: 'Créée le {{date}}',
    revoke: 'Révoquer',
    revokeName: 'Révoquer la clé {{name}}',
    revoked: 'Clé révoquée.',
  },
};
