// Single point of access to the access token. It lives in this module's
// memory only, never in localStorage, so an injected script has nothing to
// read (ADR-0011); a reload loses it and the refresh cookie brings it back.
// The fetch wrapper (src/lib/api.ts) reads it on every request rather than
// holding it in React state, so every consumer always sees the latest value.
let accessToken: string | null = null;

/** The current access token, or `null`: signed out, or before the startup refresh lands. */
export function getAuthToken() {
  return accessToken;
}

/** Stores the token from a login, the OAuth exchange or a refresh. */
export function setAuthToken(token: string) {
  accessToken = token;
}

/** Drops the token: logout, a dead session, a failed sign-in rolled back. */
export function removeAuthToken() {
  accessToken = null;
}
