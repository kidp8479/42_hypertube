import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import i18n from '../lib/i18n';
import { AuthContext } from '../features/auth/auth-context';
import type { AuthState } from '../features/auth/auth-reducer';
import { fakeUser } from '../test/fixtures';
import { useLanguageSync } from './language-sync';

function wrapperFor(state: AuthState) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <AuthContext.Provider
        value={{
          state,
          login: vi.fn(),
          loginWithOAuthCode: vi.fn(),
          logout: vi.fn(),
        }}
      >
        {children}
      </AuthContext.Provider>
    );
  };
}

const anonymous: AuthState = { status: 'anonymous', user: null };

// The language and <html lang> are globals: reset them between tests.
afterEach(async () => {
  vi.restoreAllMocks();
  await i18n.changeLanguage('en');
});

describe('useLanguageSync', () => {
  it("uses the logged-in user's saved language", async () => {
    renderHook(() => useLanguageSync(), {
      wrapper: wrapperFor({
        status: 'authenticated',
        user: { ...fakeUser, preferredLanguage: 'fr' },
      }),
    });

    await waitFor(() => expect(i18n.language).toBe('fr'));
    expect(document.documentElement.lang).toBe('fr');
  });

  it('uses the browser language for an anonymous visitor', async () => {
    vi.spyOn(navigator, 'languages', 'get').mockReturnValue(['fr-FR']);

    renderHook(() => useLanguageSync(), { wrapper: wrapperFor(anonymous) });

    await waitFor(() => expect(i18n.language).toBe('fr'));
  });

  it("prefers a language chosen by hand over the browser's", async () => {
    vi.spyOn(navigator, 'languages', 'get').mockReturnValue(['fr']);
    localStorage.setItem('hypertube_language', 'en');

    renderHook(() => useLanguageSync(), { wrapper: wrapperFor(anonymous) });

    await waitFor(() => expect(i18n.language).toBe('en'));
  });

  it('keeps <html lang> in step with any later language change', async () => {
    renderHook(() => useLanguageSync(), { wrapper: wrapperFor(anonymous) });

    await act(() => i18n.changeLanguage('fr'));

    expect(document.documentElement.lang).toBe('fr');
  });
});
