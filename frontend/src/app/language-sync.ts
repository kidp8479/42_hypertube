// Keeps the UI language and `<html lang>` in step with who is using the app.
import { useEffect } from 'react';
import i18n from '../lib/i18n';
import { readStoredLanguage, resolveLanguage } from '../lib/language';
import { useAuth } from '../features/auth/auth-context';

/**
 * Call once, under `AuthProvider`. Re-resolves the language when the logged-in
 * user's saved language changes (login, logout), and mirrors every language
 * change, whoever triggers it, onto `<html lang>` for screen readers and
 * browser translation.
 */
export function useLanguageSync(): void {
  const { state } = useAuth();
  const userLanguage = state.user?.preferredLanguage;

  // Declared first so its listener is in place before the effect below can
  // change the language: effects run in declaration order.
  useEffect(() => {
    const applyToDocument = (language: string) => {
      document.documentElement.lang = language;
    };
    applyToDocument(i18n.language);
    i18n.on('languageChanged', applyToDocument);
    return () => i18n.off('languageChanged', applyToDocument);
  }, []);

  useEffect(() => {
    void i18n.changeLanguage(
      resolveLanguage({
        userLanguage,
        storedLanguage: readStoredLanguage(),
        browserLanguages: navigator.languages,
      }),
    );
  }, [userLanguage]);
}
