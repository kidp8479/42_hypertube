// i18next setup, imported once from main.tsx for its side effect. English is
// the default and the fallback (subject requirement); one namespace per
// feature, its strings living next to the feature's code.
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { authEn } from '../features/auth/auth-locale-en';
import { authFr } from '../features/auth/auth-locale-fr';

export const SUPPORTED_LANGUAGES = ['en', 'fr'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

void i18n.use(initReactI18next).init({
  resources: {
    en: { auth: authEn },
    fr: { auth: authFr },
  },
  lng: 'en',
  fallbackLng: 'en',
  supportedLngs: SUPPORTED_LANGUAGES,
  defaultNS: 'auth',
  interpolation: { escapeValue: false },
});

export default i18n;
