// Which UI language to use: the pure rules, with no React and no i18next
// instance to configure. `useLanguageSync` applies the result.
import {
  DEFAULT_LANGUAGE,
  SUPPORTED_LANGUAGES,
  type SupportedLanguage,
} from './languages';

const LANGUAGE_STORAGE_KEY = 'hypertube_language';

export function isSupportedLanguage(
  value: unknown,
): value is SupportedLanguage {
  return SUPPORTED_LANGUAGES.some((language) => language === value);
}

/**
 * The language an anonymous visitor picked by hand, if any. Storage can throw
 * (private window, blocked site data), and then the choice is simply unknown.
 */
export function readStoredLanguage(): SupportedLanguage | null {
  try {
    const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    return isSupportedLanguage(stored) ? stored : null;
  } catch {
    return null;
  }
}

export function storeLanguage(language: SupportedLanguage): void {
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  } catch {
    // Unwritable storage only loses the memory of the choice, not the choice.
  }
}

/**
 * First supported language in the browser's preference order. Matches on the
 * primary subtag, so `fr-CA` picks `fr`.
 */
export function pickBrowserLanguage(
  browserLanguages: readonly string[],
): SupportedLanguage | null {
  for (const tag of browserLanguages) {
    const primary = tag.toLowerCase().split('-')[0];
    if (isSupportedLanguage(primary)) {
      return primary;
    }
  }
  return null;
}

/**
 * Priority: the account's saved language, then a manual choice made while
 * anonymous, then the browser's, then English.
 */
export function resolveLanguage(sources: {
  userLanguage: SupportedLanguage | undefined;
  storedLanguage: SupportedLanguage | null;
  browserLanguages: readonly string[];
}): SupportedLanguage {
  return (
    sources.userLanguage ??
    sources.storedLanguage ??
    pickBrowserLanguage(sources.browserLanguages) ??
    DEFAULT_LANGUAGE
  );
}
