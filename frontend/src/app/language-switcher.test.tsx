// Spec for LanguageSwitcher: switching the UI, remembering the choice, and
// saving it on the account when logged in.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import i18n from '../lib/i18n';
import { AuthContext } from '../features/auth/auth-context';
import type { AuthState } from '../features/auth/auth-reducer';
import { fakeUser, fakeAuth } from '../test/fixtures';
import { LanguageSwitcher } from './language-switcher';

function renderSwitcher(state: AuthState) {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <AuthContext.Provider value={fakeAuth(state)}>
        <LanguageSwitcher />
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
  return userEvent.setup();
}

const anonymous: AuthState = { status: 'anonymous', user: null };
const authenticated: AuthState = { status: 'authenticated', user: fakeUser };

afterEach(async () => {
  vi.unstubAllGlobals();
  await i18n.changeLanguage('en');
});

describe('LanguageSwitcher', () => {
  it('switches the UI and remembers the choice for an anonymous visitor', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const user = renderSwitcher(anonymous);

    await user.selectOptions(screen.getByLabelText('Language'), 'fr');

    expect(i18n.language).toBe('fr');
    expect(localStorage.getItem('hypertube_language')).toBe('fr');
    expect(screen.getByLabelText('Langue')).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('also saves the language on the account when logged in', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const user = renderSwitcher(authenticated);

    await user.selectOptions(screen.getByLabelText('Language'), 'fr');

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`/api/users/${fakeUser.id}`);
    expect(init.method).toBe('PATCH');
    expect(init.body).toBe(JSON.stringify({ preferredLanguage: 'fr' }));
  });
});
