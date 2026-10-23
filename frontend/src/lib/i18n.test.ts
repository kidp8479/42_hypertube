// Spec for the i18n setup: English by default, a missing key fails loudly in
// tests, and the starting language is resolved before the first render.
import { afterEach, describe, expect, it, vi } from 'vitest';
import i18n from './i18n';

describe('i18n test setup', () => {
  it('resolves a known key in English by default', () => {
    expect(i18n.t('errors.generic')).toBe(
      'Something went wrong. Please try again.',
    );
  });

  it('fails loudly on a key that does not exist', () => {
    expect(() => i18n.t('register.doesNotExist')).toThrow(
      /Missing i18n key "auth:register.doesNotExist"/,
    );
  });
});

describe('initial language', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it('is the browser language from the very first render, not after an effect', async () => {
    vi.spyOn(navigator, 'languages', 'get').mockReturnValue(['fr-FR']);
    vi.resetModules();

    const { default: freshI18n } = await import('./i18n');

    expect(freshI18n.language).toBe('fr');
  });

  it('is the manually chosen language when one is stored', async () => {
    vi.spyOn(navigator, 'languages', 'get').mockReturnValue(['fr-FR']);
    localStorage.setItem('hypertube_language', 'en');
    vi.resetModules();

    const { default: freshI18n } = await import('./i18n');

    expect(freshI18n.language).toBe('en');
  });
});
