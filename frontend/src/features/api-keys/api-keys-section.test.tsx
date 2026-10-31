// Spec for the API keys section: the list, a new key's secret shown once,
// the refusals, and revoking.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ApiKeysSection } from './api-keys-section';

const key = {
  id: 3,
  name: 'my script',
  clientId: 'hyp_abc',
  createdAt: '2026-10-31T12:00:00Z',
};

type Route = () => Response;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status });

/** Answers each `METHOD /path` from `routes`; anything else is a 500. */
function renderSection(routes: Record<string, Route>) {
  const fetchMock = vi.fn((path: string, init?: RequestInit) => {
    const route = routes[`${init?.method ?? 'GET'} ${path}`];
    return Promise.resolve(
      route ? route() : new Response(null, { status: 500 }),
    );
  });
  vi.stubGlobal('fetch', fetchMock);
  render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <ApiKeysSection />
    </QueryClientProvider>,
  );
  return { fetchMock, user: userEvent.setup() };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('ApiKeysSection', () => {
  it('lists the keys by name and client id, never a secret', async () => {
    renderSection({ 'GET /api/api-clients': () => json([key]) });

    const list = await screen.findByRole('list', { name: 'Your keys' });
    expect(within(list).getByText('my script')).toBeInTheDocument();
    expect(within(list).getByText(/hyp_abc/)).toBeInTheDocument();
  });

  it('says so when there is no key yet', async () => {
    renderSection({ 'GET /api/api-clients': () => json([]) });

    expect(await screen.findByText('No API key yet.')).toBeInTheDocument();
  });

  it('shows a new key with its secret once, then hides it for good', async () => {
    let keys: unknown[] = [];
    const { fetchMock, user } = renderSection({
      'GET /api/api-clients': () => json(keys),
      'POST /api/api-clients': () => {
        keys = [key];
        return json({ ...key, secret: 's3cr3t' }, 201);
      },
    });

    await user.type(screen.getByLabelText('Key name'), ' my script ');
    await user.click(screen.getByRole('button', { name: 'Create a key' }));

    expect(await screen.findByText('s3cr3t')).toBeInTheDocument();
    const post = fetchMock.mock.calls.find(
      ([, init]) => init?.method === 'POST',
    );
    expect(JSON.parse(post?.[1]?.body as string)).toEqual({
      name: 'my script',
    });
    expect(
      await screen.findByRole('list', { name: 'Your keys' }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Done, I copied it' }));

    expect(screen.queryByText('s3cr3t')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Key name')).toBeInTheDocument();
  });

  it('asks for a name before sending anything', async () => {
    const { fetchMock, user } = renderSection({
      'GET /api/api-clients': () => json([]),
    });

    await user.click(screen.getByRole('button', { name: 'Create a key' }));

    expect(screen.getByText('Name the key')).toBeInTheDocument();
    expect(
      fetchMock.mock.calls.some(([, init]) => init?.method === 'POST'),
    ).toBe(false);
  });

  it('says to revoke one first at 5 keys (409)', async () => {
    const { user } = renderSection({
      'GET /api/api-clients': () => json([key]),
      'POST /api/api-clients': () => new Response(null, { status: 409 }),
    });

    await user.type(screen.getByLabelText('Key name'), 'sixth');
    await user.click(screen.getByRole('button', { name: 'Create a key' }));

    expect(
      await screen.findByText('You already have 5 keys: revoke one first.'),
    ).toBeInTheDocument();
  });

  it('revokes a key, then lists what is left', async () => {
    let keys: unknown[] = [key];
    const { user } = renderSection({
      'GET /api/api-clients': () => json(keys),
      'DELETE /api/api-clients/3': () => {
        keys = [];
        return new Response(null, { status: 200 });
      },
    });

    await user.click(
      await screen.findByRole('button', { name: 'Revoke the key my script' }),
    );

    expect(await screen.findByText('Key revoked.')).toBeInTheDocument();
    expect(await screen.findByText('No API key yet.')).toBeInTheDocument();
  });

  it('offers a retry when the list fails to load', async () => {
    renderSection({});

    expect(
      await screen.findByRole('button', { name: 'Try again' }),
    ).toBeInTheDocument();
  });
});
