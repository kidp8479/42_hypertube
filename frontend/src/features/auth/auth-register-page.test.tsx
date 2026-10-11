import { afterEach, describe, it, expect, vi } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import { ApiError } from '../../lib/api';
import i18n from '../../lib/i18n';
import { AuthContext, type AuthContextValue } from './auth-context';
import type { AuthState } from './auth-reducer';
import { fakeUser } from '../../test/fixtures';
import { RegisterPage } from './auth-register-page';
import { registerRequest } from './auth-actions';

vi.mock('./auth-actions', () => ({
  registerRequest: vi.fn(),
}));

// Stands in for /login: also surfaces the router `state` RegisterPage hands
// off, so a test can tell "navigated home" apart from "navigated with the
// registered notice".
function LoginStub() {
  const location = useLocation();
  const justRegistered = (location.state as { justRegistered?: boolean } | null)
    ?.justRegistered;
  return <p>login page{justRegistered ? ' - registered' : ''}</p>;
}

function renderRegisterPage(
  state: AuthState = { status: 'anonymous', user: null },
) {
  const value: AuthContextValue = {
    state,
    login: vi.fn(),
    loginWithOAuthCode: vi.fn(),
    logout: vi.fn(),
  };
  render(
    <AuthContext.Provider value={value}>
      <MemoryRouter initialEntries={['/register']}>
        <Routes>
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/login" element={<LoginStub />} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  );
  return { user: userEvent.setup() };
}

async function fillValidForm(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Email'), 'ada@example.com');
  await user.type(screen.getByLabelText('Username'), 'adalovelace');
  await user.type(screen.getByLabelText('First name'), 'Ada');
  await user.type(screen.getByLabelText('Last name'), 'Lovelace');
  await user.type(screen.getByLabelText('Password'), 'correct horse');
  await user.type(screen.getByLabelText('Confirm password'), 'correct horse');
}

// The language is a global on the shared i18n instance: put it back.
afterEach(async () => {
  await i18n.changeLanguage('en');
});

describe('RegisterPage', () => {
  it('blocks submission and shows field errors when the form is invalid', async () => {
    const { user } = renderRegisterPage();

    await user.click(screen.getByRole('button', { name: 'Register' }));

    expect(await screen.findByText('Email is required')).toBeInTheDocument();
    expect(registerRequest).not.toHaveBeenCalled();
  });

  it('registers the account in the language the visitor is browsing in', async () => {
    vi.mocked(registerRequest).mockResolvedValue(undefined);
    const { user } = renderRegisterPage();
    await fillValidForm(user);

    await act(() => i18n.changeLanguage('fr'));
    await user.click(screen.getByRole('button', { name: 'S’inscrire' }));

    expect(registerRequest).toHaveBeenCalledWith(expect.anything(), 'fr');
  });

  it('registers and redirects to /login with the "account created" notice', async () => {
    vi.mocked(registerRequest).mockResolvedValue(undefined);
    const { user } = renderRegisterPage();

    await fillValidForm(user);
    await user.click(screen.getByRole('button', { name: 'Register' }));

    expect(registerRequest).toHaveBeenCalledWith(
      {
        email: 'ada@example.com',
        username: 'adalovelace',
        firstName: 'Ada',
        lastName: 'Lovelace',
        password: 'correct horse',
        confirmPassword: 'correct horse',
      },
      'en',
    );
    expect(
      await screen.findByText('login page - registered'),
    ).toBeInTheDocument();
  });

  it('shows a conflict message and stays on the form when registration 409s', async () => {
    vi.mocked(registerRequest).mockRejectedValue(new ApiError(409));
    const { user } = renderRegisterPage();

    await fillValidForm(user);
    await user.click(screen.getByRole('button', { name: 'Register' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'An account with this email or username already exists.',
    );
    expect(screen.queryByText(/login page/)).not.toBeInTheDocument();
  });

  it('shows a generic error when registration fails for any other reason', async () => {
    vi.mocked(registerRequest).mockRejectedValue(new Error('network down'));
    const { user } = renderRegisterPage();

    await fillValidForm(user);
    await user.click(screen.getByRole('button', { name: 'Register' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Something went wrong. Please try again.',
    );
  });

  it('redirects an already-authenticated visitor away from /register', () => {
    renderRegisterPage({ status: 'authenticated', user: fakeUser });

    expect(
      screen.queryByRole('button', { name: 'Register' }),
    ).not.toBeInTheDocument();
  });

  it('re-enables the submit button after a failed attempt', async () => {
    vi.mocked(registerRequest).mockRejectedValue(new ApiError(409));
    const { user } = renderRegisterPage();

    await fillValidForm(user);
    await user.click(screen.getByRole('button', { name: 'Register' }));

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Register' })).toBeEnabled(),
    );
  });
});
