// Spec for HomePage: shows the signed-in user and follows a language switch.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import i18n from '../../lib/i18n';
import { AuthContext } from './auth-context';
import { fakeUser } from '../../test/fixtures';
import { HomePage } from './auth-home-page';

function renderHomePage() {
  render(
    <AuthContext.Provider
      value={{
        state: { status: 'authenticated', user: fakeUser },
        login: vi.fn(),
        loginWithOAuthCode: vi.fn(),
        logout: vi.fn(),
        updateUser: vi.fn(),
      }}
    >
      <HomePage />
    </AuthContext.Provider>,
  );
}

// The language is a global on the shared i18n instance: put it back so one
// test cannot leak French into the next.
afterEach(async () => {
  await i18n.changeLanguage('en');
});

describe('HomePage', () => {
  it('shows the signed-in user', () => {
    renderHomePage();

    expect(screen.getByText(fakeUser.username)).toBeInTheDocument();
  });

  it('re-renders in French when the language changes', async () => {
    renderHomePage();

    await act(() => i18n.changeLanguage('fr'));

    expect(screen.getByText(/Connecté/)).toBeInTheDocument();
    expect(screen.getByText(fakeUser.username)).toBeInTheDocument();
  });
});
