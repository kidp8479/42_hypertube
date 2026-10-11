import { describe, expect, it } from 'vitest';
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
