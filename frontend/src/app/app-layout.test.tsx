// Spec for AppLayout: the header, main and footer landmarks on every page, and
// the account controls only once signed in.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import i18n from '../lib/i18n';
import { AuthContext } from '../features/auth/auth-context';
import type { AuthState } from '../features/auth/auth-reducer';
import { fakeUser } from '../test/fixtures';
import { AppLayout } from './app-layout';

function renderLayout(state: AuthState) {
  const logout = vi.fn();
  render(
    <QueryClientProvider client={new QueryClient()}>
      <AuthContext.Provider
        value={{ state, login: vi.fn(), loginWithOAuthCode: vi.fn(), logout }}
      >
        <MemoryRouter initialEntries={['/']}>
          <Routes>
            <Route element={<AppLayout />}>
              <Route path="/" element={<p>page content</p>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
  return { logout, user: userEvent.setup() };
}

afterEach(async () => {
  await i18n.changeLanguage('en');
});

describe('AppLayout', () => {
  it('frames the page with one header, one main and one footer', () => {
    renderLayout({ status: 'anonymous', user: null });

    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByRole('main')).toHaveTextContent('page content');
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
    expect(screen.getByLabelText('Language')).toBeInTheDocument();
  });

  it('shows no account controls nor sections to a signed-out visitor', () => {
    renderLayout({ status: 'anonymous', user: null });

    expect(screen.queryByRole('button', { name: 'Log out' })).toBeNull();
    expect(screen.queryByRole('navigation')).toBeNull();
  });

  it('gives a signed-in user the account, a one-click logout and the sections', async () => {
    const { logout, user } = renderLayout({
      status: 'authenticated',
      user: fakeUser,
    });

    expect(screen.getByText(fakeUser.username)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Library' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    await user.click(screen.getByRole('button', { name: 'Log out' }));
    expect(logout).toHaveBeenCalledTimes(1);
  });
});
