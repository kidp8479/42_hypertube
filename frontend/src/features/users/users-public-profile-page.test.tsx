// Spec for PublicProfilePage: another user's public fields only, one's own id
// sent to /profile, and a 404 page for a bad or unknown id.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AuthContext } from '../auth/auth-context';
import { fakeUser } from '../../test/fixtures';
import { PublicProfilePage } from './users-public-profile-page';

function renderAt(path: string, answer?: Response) {
  const fetchMock = vi.fn().mockResolvedValue(answer);
  vi.stubGlobal('fetch', fetchMock);
  render(
    // No retries, like the app's client (lib/query-client.ts).
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <AuthContext.Provider
        value={{
          state: { status: 'authenticated', user: fakeUser },
          login: vi.fn(),
          loginWithOAuthCode: vi.fn(),
          logout: vi.fn(),
          updateUser: vi.fn(),
        }}
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
});
