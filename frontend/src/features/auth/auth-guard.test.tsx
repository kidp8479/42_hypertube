import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthContext, type AuthContextValue } from './auth-context';
import type { AuthState } from './auth-reducer';
import type { User } from './auth-types';
import { RequireAuth } from './auth-guard';

const fakeUser: User = {
  id: 1,
  email: 'ada@example.com',
  username: 'ada',
  firstName: 'Ada',
  lastName: 'Lovelace',
  profilePicture: null,
  preferredLanguage: 'en',
  createdAt: '2020-01-01T00:00:00.000Z',
  updatedAt: '2020-01-01T00:00:00.000Z',
};

// Render the guard inside a real router so a redirect actually changes the
// rendered route, exactly as it would in the app. `/` is protected, `/login`
// is the public landing the guard sends anonymous users to.
function renderGuard(state: AuthState) {
  const value: AuthContextValue = {
    state,
    login: vi.fn(),
    logout: vi.fn(),
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

  it('renders neither route while auth is still resolving', () => {
    renderGuard({ status: 'loading', user: null });

    expect(screen.queryByText('protected content')).not.toBeInTheDocument();
    expect(screen.queryByText('login page')).not.toBeInTheDocument();
  });
});
