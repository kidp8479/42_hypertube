// i18next setup, imported once from main.tsx for its side effect. English is
// the default and the fallback (subject requirement); one namespace per
// feature, its strings living next to the feature's code.
//
// The starting language is resolved here, before the first render, from what
// is known without an account (manual choice, then browser): a French visitor
// never sees a flash of English. `useLanguageSync` takes over once the
// logged-in user's saved language is known.
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { commonEn } from '../app/common-locale-en';
import { commonFr } from '../app/common-locale-fr';
import { authEn } from '../features/auth/auth-locale-en';
import { authFr } from '../features/auth/auth-locale-fr';
import { DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES } from './languages';
import { readStoredLanguage, resolveLanguage } from './language';

void i18n.use(initReactI18next).init({
  resources: {
    en: { auth: authEn, common: commonEn },
    fr: { auth: authFr, common: commonFr },
  },
  lng: resolveLanguage({
    userLanguage: undefined,
    storedLanguage: readStoredLanguage(),
    browserLanguages: navigator.languages,
  }),
  fallbackLng: DEFAULT_LANGUAGE,
  supportedLngs: SUPPORTED_LANGUAGES,
  defaultNS: 'auth',
  interpolation: { escapeValue: false },
});

export default i18n;
