// Spec for RequireAuth: protected route when authenticated, redirect to
// /login when anonymous, a loading message while auth is resolving.
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthContext, type AuthContextValue } from './auth-context';
import type { AuthState } from './auth-reducer';
import { fakeUser } from '../../test/fixtures';
import { RequireAuth } from './auth-guard';

// Render the guard inside a real router so a redirect actually changes the
// rendered route, exactly as it would in the app. `/` is protected, `/login`
// is the public landing the guard sends anonymous users to.
function renderGuard(state: AuthState) {
  const value: AuthContextValue = {
    state,
    login: vi.fn(),
    loginWithOAuthCode: vi.fn(),
    logout: vi.fn(),
    updateUser: vi.fn(),
  };
  return render(
    <AuthContext.Provider value={value}>
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/login" element={<p>login page</p>} />
          <Route element={<RequireAuth />}>
            <Route path="/" element={<p>protected content</p>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  );
}

describe('RequireAuth', () => {
  it('renders the protected route when authenticated', () => {
    renderGuard({ status: 'authenticated', user: fakeUser });

    expect(screen.getByText('protected content')).toBeInTheDocument();
  });

  it('redirects to /login when anonymous', () => {
    renderGuard({ status: 'anonymous', user: null });

    expect(screen.getByText('login page')).toBeInTheDocument();
    expect(screen.queryByText('protected content')).not.toBeInTheDocument();
  });

  it('shows a loading status, neither route, while auth is still resolving', () => {
    renderGuard({ status: 'loading', user: null });

    expect(screen.getByRole('status')).toHaveTextContent('Loading…');
    expect(screen.queryByText('protected content')).not.toBeInTheDocument();
    expect(screen.queryByText('login page')).not.toBeInTheDocument();
  });
});
