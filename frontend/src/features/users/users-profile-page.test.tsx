// Spec for ProfilePage: what each form sends (PATCH /users/:id, the picture
// routes), and how each refusal reads.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthContext } from '../auth/auth-context';
import { fakeUser, fakeAuth } from '../../test/fixtures';
import { ProfilePage } from './users-profile-page';

// The API keys section has its own spec; here it would add a request of its
// own to every fetch these tests inspect.
vi.mock('../api-keys/api-keys-section', () => ({
  ApiKeysSection: () => null,
}));

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
    expect(screen.getByLabelText('Username')).toHaveAttribute(
      'aria-invalid',
      'true',
    );
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

    expect(await screen.findByText('Email updated.')).toBeInTheDocument();
    expect(sentBody()).toEqual({
      email: 'ada@example.org',
      currentPassword: 'secret-123',
    });
  });

  it('says only the password changed when the email was left as is', async () => {
    const { sentBody, user } = renderProfile(json(fakeUser));

    await user.type(screen.getByLabelText('New password'), 'new-secret-123');
    await user.type(
      screen.getByLabelText('Confirm password'),
      'new-secret-123',
    );
    await user.type(screen.getByLabelText('Current password'), 'secret-123');
    await user.click(screen.getByRole('button', { name: 'Update' }));

    expect(await screen.findByText('Password updated.')).toBeInTheDocument();
    expect(sentBody()).toEqual({
      password: 'new-secret-123',
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

describe('ProfilePage picture form', () => {
  const picture = new File(['png'], 'me.png', { type: 'image/png' });

  it('uploads the picked file, then shows the saved profile', async () => {
    const saved = { ...fakeUser, profilePicture: 'a.png' };
    const { fetchMock, updateUser, user } = renderProfile(json(saved));

    await user.upload(screen.getByLabelText('Profile picture'), picture);
    await user.click(screen.getByRole('button', { name: 'Upload' }));

    expect(await screen.findByText('Picture updated.')).toBeInTheDocument();
    const [path, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(path).toBe(`/api/users/${fakeUser.id}/picture`);
    expect(init.method).toBe('PUT');
    expect((init.body as FormData).get('picture')).toBeInstanceOf(File);
    expect(updateUser).toHaveBeenCalledWith(saved);
  });

  it('says so when the backend reads the file as no image (400)', async () => {
    const { user } = renderProfile(new Response(null, { status: 400 }));

    await user.upload(screen.getByLabelText('Profile picture'), picture);
    await user.click(screen.getByRole('button', { name: 'Upload' }));

    expect(
      await screen.findByText('This file is not a JPEG, PNG or WebP image.'),
    ).toBeInTheDocument();
  });

  it('offers no upload before a file is picked', () => {
    renderProfile(json(fakeUser));

    expect(screen.getByRole('button', { name: 'Upload' })).toBeDisabled();
    expect(
      screen.queryByRole('button', { name: 'Remove picture' }),
    ).not.toBeInTheDocument();
  });
});
