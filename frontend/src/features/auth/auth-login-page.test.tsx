import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ApiError } from '../../lib/api';
import { AuthContext, type AuthContextValue } from './auth-context';
import type { AuthState } from './auth-reducer';
import type { User } from './auth-types';
import { LoginPage } from './auth-login-page';

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

// `/` renders a marker so "navigated home" is observable as a DOM change.
function renderLoginPage(
  state: AuthState = { status: 'anonymous', user: null },
) {
  const login = vi.fn<AuthContextValue['login']>();
  const value: AuthContextValue = { state, login, logout: vi.fn() };
  render(
    <AuthContext.Provider value={value}>
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<p>home page</p>} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  );
  return { login, user: userEvent.setup() };
}

async function fillAndSubmit(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Email'), 'ada@example.com');
  await user.type(screen.getByLabelText('Password'), 'correct horse');
  await user.click(screen.getByRole('button', { name: 'Log in' }));
}

describe('LoginPage', () => {
  it('calls login with the entered credentials and navigates home on success', async () => {
    const { login, user } = renderLoginPage();
    login.mockResolvedValue(undefined);

    await fillAndSubmit(user);

    expect(login).toHaveBeenCalledWith('ada@example.com', 'correct horse');
    expect(await screen.findByText('home page')).toBeInTheDocument();
  });

  it('shows a credentials error and stays on the form when login 401s', async () => {
    const { login, user } = renderLoginPage();
    login.mockRejectedValue(new ApiError(401));

    await fillAndSubmit(user);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Invalid email or password.',
    );
    expect(screen.queryByText('home page')).not.toBeInTheDocument();
  });

  it('shows a generic error when login fails for any other reason', async () => {
    const { login, user } = renderLoginPage();
    login.mockRejectedValue(new Error('network down'));

    await fillAndSubmit(user);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Something went wrong. Please try again.',
    );
  });

  it('redirects an already-authenticated visitor away from /login', () => {
    renderLoginPage({ status: 'authenticated', user: fakeUser });

    expect(screen.getByText('home page')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Log in' }),
    ).not.toBeInTheDocument();
  });

  it('re-enables the submit button after a failed attempt', async () => {
    const { login, user } = renderLoginPage();
    login.mockRejectedValue(new ApiError(401));

    await fillAndSubmit(user);

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Log in' })).toBeEnabled(),
    );
  });
});
