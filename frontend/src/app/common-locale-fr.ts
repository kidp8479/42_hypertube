// French strings of the `common` namespace, typed against the English tree.
import type { commonEn } from './common-locale-en';

export const commonFr: typeof commonEn = {
  language: {
    label: 'Langue',
  },
  header: {
    logout: 'Se déconnecter',
    sections: 'Sections',
    library: 'Bibliothèque',
    profile: 'Mon profil',
  },
  loading: 'Chargement…',
  errors: {
    generic: 'Une erreur est survenue. Veuillez réessayer.',
    retry: 'Réessayer',
  },
  notFound: {
    title: 'Page introuvable',
    body: "Il n'y a rien à cette adresse.",
    home: "Retour à l'accueil",
  },
  footer: {
    project: "Hypertube · un projet de l'école 42 Paris",
    source: 'Code source',
  },
};
