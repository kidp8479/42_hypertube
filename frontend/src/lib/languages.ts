// The languages the UI ships, with no side effects: both the i18next setup
// and the pure language rules import from here, so neither has to import the
// other.
export const SUPPORTED_LANGUAGES = ['en', 'fr'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const DEFAULT_LANGUAGE: SupportedLanguage = 'en';
