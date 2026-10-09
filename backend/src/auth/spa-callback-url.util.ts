// Builds the SPA URL every OAuth callback ends on, success or failure.

/** What the SPA's `/oauth/callback` page reads from `?error=`. */
export type OAuthCallbackError = 'cancelled' | 'email_unverified' | 'failed';

/**
 * The SPA's `/oauth/callback` page with exactly one query parameter: the
 * single-use exchange `code` on success, or an `error` reason on failure.
 */
export function spaCallbackUrl(
  frontendOrigin: string,
  param: { code: string } | { error: OAuthCallbackError },
): string {
  const url = new URL('/oauth/callback', frontendOrigin);
  if ('code' in param) {
    url.searchParams.set('code', param.code);
  } else {
    url.searchParams.set('error', param.error);
  }
  return url.toString();
}
