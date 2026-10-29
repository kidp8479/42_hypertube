// Unit spec for the URL every OAuth callback redirects the browser to.
import { spaCallbackUrl } from './spa-callback-url.util';

describe('spaCallbackUrl', () => {
  it('carries the exchange code on success', () => {
    expect(spaCallbackUrl('https://hypertube.test', { code: 'abc' })).toBe(
      'https://hypertube.test/oauth/callback?code=abc',
    );
  });

  it('carries the error reason on failure', () => {
    expect(
      spaCallbackUrl('https://hypertube.test', { error: 'cancelled' }),
    ).toBe('https://hypertube.test/oauth/callback?error=cancelled');
  });

  it('keeps a non-default port', () => {
    expect(spaCallbackUrl('https://localhost:8443', { code: 'abc' })).toBe(
      'https://localhost:8443/oauth/callback?code=abc',
    );
  });

  it.each(['https://hypertube.test/', 'https://hypertube.test/app/'])(
    'puts the page at the root of %p (FRONTEND_ORIGIN is an origin)',
    (origin) => {
      expect(spaCallbackUrl(origin, { error: 'failed' })).toBe(
        'https://hypertube.test/oauth/callback?error=failed',
      );
    },
  );

  it('encodes the code rather than letting it add parameters', () => {
    const url = new URL(
      spaCallbackUrl('https://hypertube.test', { code: 'a&error=failed' }),
    );
    expect([...url.searchParams]).toEqual([['code', 'a&error=failed']]);
  });
});
