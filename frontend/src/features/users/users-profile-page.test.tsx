// Spec for ProfilePage: what each form sends to PATCH /users/:id, and how
// each refusal reads.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthContext } from '../auth/auth-context';
import { fakeUser, fakeAuth } from '../../test/fixtures';
import { ProfilePage } from './users-profile-page';

function renderProfile(answer: Response) {
  const fetchMock = vi.fn().mockResolvedValue(answer);
  vi.stubGlobal('fetch', fetchMock);
  const updateUser = vi.fn();
  render(
    <QueryClientProvider client={new QueryClient()}>
      <AuthContext.Provider
        value={fakeAuth(
          { status: 'authenticated', user: fakeUser },
          { updateUser },
        )}
      >
        <ProfilePage />
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
  const sentBody = () => {
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    return JSON.parse(init.body as string) as unknown;
  };
  return { fetchMock, sentBody, updateUser, user: userEvent.setup() };
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status });

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('ProfilePage information form', () => {
  it('sends only the changed field, then shows the saved profile', async () => {
    const saved = { ...fakeUser, firstName: 'Augusta' };
    const { sentBody, updateUser, user } = renderProfile(json(saved));

    await user.clear(screen.getByLabelText('First name'));
    await user.type(screen.getByLabelText('First name'), 'Augusta');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('Profile saved.')).toBeInTheDocument();
    expect(sentBody()).toEqual({ firstName: 'Augusta' });
    expect(updateUser).toHaveBeenCalledWith(saved);
  });

  it('says so when the username is taken (409)', async () => {
    const { user } = renderProfile(new Response(null, { status: 409 }));

    await user.type(screen.getByLabelText('Username'), '2');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(
      await screen.findByText('This username is already taken.'),
    ).toBeInTheDocument();
  });
});

describe('ProfilePage email and password form', () => {
  async function submitNewEmail(answer: Response) {
    const rendered = renderProfile(answer);
    const { user } = rendered;
    await user.clear(screen.getByLabelText('Email'));
    await user.type(screen.getByLabelText('Email'), 'Ada@Example.org');
    await user.type(screen.getByLabelText('Current password'), 'secret-123');
    await user.click(screen.getByRole('button', { name: 'Update' }));
    return rendered;
  }

  it('sends the new email with the current password', async () => {
    const { sentBody } = await submitNewEmail(
      json({ ...fakeUser, email: 'ada@example.org' }),
    );

    expect(
      await screen.findByText('Email and password updated.'),
    ).toBeInTheDocument();
    expect(sentBody()).toEqual({
      email: 'ada@example.org',
      currentPassword: 'secret-123',
    });
  });

  it.each([
    [403, 'The current password is wrong.'],
    [409, 'This email address is already used by another account.'],
    [400, /has no password yet/],
  ])('reads a %i as "%s"', async (status, message) => {
    await submitNewEmail(new Response(null, { status }));

    expect(await screen.findByText(message)).toBeInTheDocument();
  });

  it('sends nothing when neither the email nor the password changed', async () => {
    const { fetchMock, user } = renderProfile(json(fakeUser));

    await user.type(screen.getByLabelText('Current password'), 'secret-123');
    await user.click(screen.getByRole('button', { name: 'Update' }));

    expect(
      screen.getByText('Change the email or enter a new password first.'),
    ).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
