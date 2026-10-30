// Spec for PublicProfilePage: another user's public fields only, one's own id
// sent to /profile, a 404 page for a bad or unknown id, and a retry on any
// other failure.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AuthContext } from '../auth/auth-context';
import { fakeUser, fakeAuth } from '../../test/fixtures';
import { PublicProfilePage } from './users-public-profile-page';

function renderAt(path: string, ...answers: Response[]) {
  const fetchMock = vi.fn();
  answers.forEach((answer) => fetchMock.mockResolvedValueOnce(answer));
  vi.stubGlobal('fetch', fetchMock);
  render(
    // No retries, like the app's client (lib/query-client.ts).
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <AuthContext.Provider
        value={fakeAuth({ status: 'authenticated', user: fakeUser })}
      >
        <MemoryRouter initialEntries={[path]}>
          <Routes>
            <Route path="/users/:id" element={<PublicProfilePage />} />
            <Route path="/profile" element={<p>own profile page</p>} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('PublicProfilePage', () => {
  it("shows another user's username", async () => {
    const fetchMock = renderAt(
      '/users/2',
      new Response(
        JSON.stringify({ id: 2, username: 'grace', profilePicture: null }),
      ),
    );

    expect(
      await screen.findByRole('heading', { level: 1, name: 'grace' }),
    ).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith('/api/users/2', expect.anything());
  });

  it.each([String(fakeUser.id), 'me'])(
    'sends one’s own id (%s) to /profile, without asking the API',
    (id) => {
      const fetchMock = renderAt(`/users/${id}`);

      expect(screen.getByText('own profile page')).toBeInTheDocument();
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );

  it.each([400, 404])('shows the 404 page on a %i', async (status) => {
    renderAt('/users/abc', new Response(null, { status }));

    expect(
      await screen.findByRole('heading', { name: 'Page not found' }),
    ).toBeInTheDocument();
  });

  it('offers a retry after a server error, which loads the profile', async () => {
    const fetchMock = renderAt(
      '/users/2',
      new Response(null, { status: 500 }),
      new Response(
        JSON.stringify({ id: 2, username: 'grace', profilePicture: null }),
      ),
    );

    await userEvent.click(
      await screen.findByRole('button', { name: 'Try again' }),
    );

    expect(
      await screen.findByRole('heading', { level: 1, name: 'grace' }),
    ).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
