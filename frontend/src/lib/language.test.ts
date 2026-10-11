import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  pickBrowserLanguage,
  readStoredLanguage,
  resolveLanguage,
} from './language';

describe('pickBrowserLanguage', () => {
  it('takes the first supported language, in browser order', () => {
    expect(pickBrowserLanguage(['de', 'fr', 'en'])).toBe('fr');
  });

  it('matches on the primary subtag, case-insensitively', () => {
    expect(pickBrowserLanguage(['FR-ca'])).toBe('fr');
  });

  it('returns null when nothing is supported', () => {
    expect(pickBrowserLanguage(['de', 'es-MX'])).toBeNull();
  });
});

describe('resolveLanguage', () => {
  const none = { userLanguage: undefined, storedLanguage: null };

  it('prefers the account language over everything', () => {
    expect(
      resolveLanguage({
        userLanguage: 'fr',
        storedLanguage: 'en',
        browserLanguages: ['en'],
      }),
    ).toBe('fr');
  });

  it('then a stored manual choice over the browser', () => {
    expect(
      resolveLanguage({
        ...none,
        storedLanguage: 'fr',
        browserLanguages: ['en'],
      }),
    ).toBe('fr');
  });

  it('then the browser language', () => {
    expect(resolveLanguage({ ...none, browserLanguages: ['fr-FR'] })).toBe(
      'fr',
    );
  });

  it('falls back to English', () => {
    expect(resolveLanguage({ ...none, browserLanguages: ['de'] })).toBe('en');
  });
});

describe('readStoredLanguage', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('ignores a stored value that is not a supported language', () => {
    localStorage.setItem('hypertube_language', 'klingon');
    expect(readStoredLanguage()).toBeNull();
  });

  it('survives storage that throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(readStoredLanguage()).toBeNull();
  });
});
