// Vitest setup: jest-dom matchers, strict i18n keys and a clean localStorage.
import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import i18n from '../lib/i18n';

// A key that resolves to nothing would render the raw key in the UI and, in
// the browser, log a warning (the defense requires a clean console). Make it
// a test failure instead of a silent fallback.
i18n.options.saveMissing = true;
i18n.options.missingKeyHandler = (languages, namespace, key) => {
  throw new Error(
    `Missing i18n key "${namespace}:${key}" (${languages.join()})`,
  );
};

// jsdom keeps localStorage across tests in a file; the auth layer stores a
// token there, so wipe it between tests to stop one test leaking into the next.
afterEach(() => {
  localStorage.clear();
});
