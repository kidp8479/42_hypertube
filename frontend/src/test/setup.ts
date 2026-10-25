// Vitest setup: jest-dom matchers, strict i18n keys, and a clean token and
// localStorage between tests.
import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import i18n from '../lib/i18n';
import { removeAuthToken } from '../lib/token';

// A key that resolves to nothing would render the raw key in the UI and, in
// the browser, log a warning (the defense requires a clean console). Make it
// a test failure instead of a silent fallback.
i18n.options.saveMissing = true;
i18n.options.missingKeyHandler = (languages, namespace, key) => {
  throw new Error(
    `Missing i18n key "${namespace}:${key}" (${languages.join()})`,
  );
};

// The token module and jsdom's localStorage (the UI language) both outlive a
// test within a file: reset them so one test cannot leak into the next.
afterEach(() => {
  removeAuthToken();
  localStorage.clear();
});
