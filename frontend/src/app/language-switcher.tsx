// Language picker, shown on every page. Standalone for now: the base layout
// (HYP-19) will host it.
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { SUPPORTED_LANGUAGES, type SupportedLanguage } from '../lib/i18n';
import { isSupportedLanguage, storeLanguage } from '../lib/language';
import { useAuth } from '../features/auth/auth-context';
import { savePreferredLanguage } from './language-actions';
import styles from './language-switcher.module.css';

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
    mutationFn: (language: SupportedLanguage) =>
      savePreferredLanguage(state.user!.id, language),
  });

  function handleChange(value: string) {
    if (!isSupportedLanguage(value)) {
      return;
    }
    void i18n.changeLanguage(value);
    storeLanguage(value);
    if (state.user) {
      save.mutate(value);
    }
  }

  return (
    <div className={styles.switcher}>
      <label>
        {t('language.label')}{' '}
        <select
          value={i18n.resolvedLanguage}
          onChange={(event) => handleChange(event.target.value)}
        >
          {SUPPORTED_LANGUAGES.map((language) => (
            <option key={language} value={language}>
              {LANGUAGE_NAMES[language]}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
