// Shared by the OAuth strategies' userProfile(): fetch a provider API and
// parse JSON, but refuse a non-2xx answer instead of handing an error body
// on as if it were the profile.

/**
 * How long one provider API call may take. Past it the call is aborted and
 * the login ends on the SPA's error page, instead of the callback hanging
 * on a stalled provider. Far above a normal answer (well under a second).
 */
export const OAUTH_PROVIDER_TIMEOUT_MS = 10_000;

export async function fetchJson<T>(url: string, init: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    signal: AbortSignal.timeout(OAUTH_PROVIDER_TIMEOUT_MS),
  });
  if (!res.ok) {
    throw new Error(`${url} responded with HTTP ${res.status}`);
  }
  return (await res.json()) as T;
}

/**
 * Runs a strategy's async profile loading behind Passport's callback API:
 * `userProfile()` must return void, so the outcome, profile or error, goes
 * to `done`. An error ends the handshake on `OAuthCallbackFilter`, which
 * redirects to the SPA with `?error=`.
 */
export function deliverProfile<P>(
  done: (err?: unknown, profile?: P) => void,
  load: () => Promise<P>,
): void {
  load().then(
    (profile) => done(undefined, profile),
    (err: unknown) => done(err),
  );
}
