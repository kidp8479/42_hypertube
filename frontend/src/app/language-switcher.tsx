// Language picker, in the app header of every page.
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  DEFAULT_LANGUAGE,
  SUPPORTED_LANGUAGES,
  type SupportedLanguage,
} from '../lib/languages';
import { isSupportedLanguage, storeLanguage } from '../lib/language';
import { ApiError, UNAUTHORIZED } from '../lib/api';
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
 * language on screen but says it is not on the account, since another device
 * or the next login would bring the old one back. A 401 says nothing here:
 * the session-expired net handles it.
 */
export function LanguageSwitcher() {
  const { t, i18n } = useTranslation('common');
  const { state, updateUser } = useAuth();
  const save = useMutation({
    mutationFn: (variables: { userId: number; language: SupportedLanguage }) =>
      savePreferredLanguage(variables.userId, variables.language),
    onSuccess: (saved) => {
      if (saved) updateUser(saved);
    },
  });
  const notSaved =
    save.isError &&
    !(save.error instanceof ApiError && save.error.status === UNAUTHORIZED);

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
    <div className="flex flex-col items-end gap-1">
      {/* On a phone the label is for screen readers only, to keep the header
          on one row. */}
      <label>
        <span className="sr-only sm:not-sr-only">{t('language.label')} </span>
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
      {/* Always in the page, so a screen reader announces the message when
          it appears. */}
      <p role="status" className="m-0 text-xs text-alert empty:hidden">
        {notSaved ? t('language.notSaved') : ''}
      </p>
    </div>
  );
}
