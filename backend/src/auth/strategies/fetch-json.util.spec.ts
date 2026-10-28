// Unit spec for fetchJson: JSON parsing, the non-2xx refusal, and the timeout
// that keeps a stalled provider from hanging the OAuth callback.
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { fetchJson, OAUTH_PROVIDER_TIMEOUT_MS } from './fetch-json.util';

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status });

describe('fetchJson', () => {
  afterEach(() => jest.restoreAllMocks());

  it('resolves the parsed body of a 2xx answer', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValueOnce(jsonResponse({ id: 1 }));

    await expect(fetchJson('https://provider.test/me', {})).resolves.toEqual({
      id: 1,
    });
  });

  it('refuses a non-2xx answer instead of returning its error body', async () => {
    jest
      .spyOn(global, 'fetch')
      .mockResolvedValueOnce(jsonResponse({ message: 'bad token' }, 401));

    await expect(fetchJson('https://provider.test/me', {})).rejects.toThrow(
      'https://provider.test/me responded with HTTP 401',
    );
  });

  describe('against a provider that never answers', () => {
    let server: Server;
    let url: string;

    beforeEach(async () => {
      // Accepts the connection, never writes a response.
      server = createServer(() => undefined);
      await new Promise<void>((resolve) => server.listen(0, resolve));
      url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/me`;
    });

    afterEach(async () => {
      server.closeAllConnections();
      await new Promise((resolve) => server.close(resolve));
    });

    it(`gives up after OAUTH_PROVIDER_TIMEOUT_MS`, async () => {
      // The real limit, shortened so the test does not wait for it.
      const shortSignal = AbortSignal.timeout(50);
      const timeout = jest
        .spyOn(AbortSignal, 'timeout')
        .mockReturnValue(shortSignal);

      await expect(fetchJson(url, {})).rejects.toMatchObject({
        name: 'TimeoutError',
      });
      expect(timeout).toHaveBeenCalledWith(OAUTH_PROVIDER_TIMEOUT_MS);
    });
  });
});
