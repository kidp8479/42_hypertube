// Language picker, shown on every page as its banner until the base layout
// (HYP-19) hosts it.
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  DEFAULT_LANGUAGE,
  SUPPORTED_LANGUAGES,
  type SupportedLanguage,
} from '../lib/languages';
import { isSupportedLanguage, storeLanguage } from '../lib/language';
import { useAuth } from '../features/auth/auth-context';
import { savePreferredLanguage } from './language-actions';

// Each language is named in itself, so it stays readable to someone who
// landed on a language they cannot read.
const LANGUAGE_NAMES: Record<SupportedLanguage, string> = {
  en: 'English',
  fr: 'Français',
};

/**
 * Switches the UI at once, then remembers the choice: in the browser for
 * everyone, and on the account when logged in. A failed save keeps the new
 * language on screen (the 401 net handles an expired session).
 */
export function LanguageSwitcher() {
  const { t, i18n } = useTranslation('common');
  const { state } = useAuth();
  const save = useMutation({
    mutationFn: (variables: { userId: number; language: SupportedLanguage }) =>
      savePreferredLanguage(variables.userId, variables.language),
  });

  function handleChange(value: string) {
    if (!isSupportedLanguage(value)) {
      return;
    }
    void i18n.changeLanguage(value);
    storeLanguage(value);
    if (state.user) {
      save.mutate({ userId: state.user.id, language: value });
    }
  }

  return (
    // Until the base layout (HYP-19) owns the page header, the switcher is the
    // banner landmark of every page.
    <header className="flex justify-end gap-2 px-4 py-2">
      <label>
        {t('language.label')}{' '}
        {/* The open option list takes the select's own background. */}
        <select
          className="min-h-target border border-edge bg-bg px-2 py-1"
          value={i18n.resolvedLanguage ?? DEFAULT_LANGUAGE}
          onChange={(event) => handleChange(event.target.value)}
        >
          {SUPPORTED_LANGUAGES.map((language) => (
            <option key={language} value={language}>
              {LANGUAGE_NAMES[language]}
            </option>
          ))}
        </select>
      </label>
    </header>
  );
}
