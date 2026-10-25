// Single point of access to the access token. It lives in this module's
// memory only, never in localStorage, so an injected script has nothing to
// read (ADR-0011); a reload loses it and the refresh cookie brings it back.
// The fetch wrapper (src/lib/api.ts) reads it on every request rather than
// holding it in React state, so every consumer always sees the latest value.
let accessToken: string | null = null;

export function getAuthToken() {
  return accessToken;
}

export function setAuthToken(token: string) {
  accessToken = token;
}

export function removeAuthToken() {
  accessToken = null;
}
