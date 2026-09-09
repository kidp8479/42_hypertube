// Single point of access to the JWT stored on the client. The fetch
// wrapper (src/lib/api.ts) reads it on every request rather than holding
// it in React state, so every consumer always sees the latest value.
export function getAuthToken() {
  return localStorage.getItem('hypertube_token');
}

export function setAuthToken(token: string) {
  return localStorage.setItem('hypertube_token', token);
}

export function removeAuthToken() {
  return localStorage.removeItem('hypertube_token');
}
