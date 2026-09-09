// The single fetch wrapper every API call in the app goes through.
import { getAuthToken } from './token';

const API_BASE = '/api';

/** A non-ok `fetch` response, surfaced with its status so callers can branch on it (401 -> logout, 403 -> ownership, ...). */
export class ApiError extends Error {
  status: number;

  constructor(status: number, message?: string) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}

/**
 * Talks to the backend through the dev proxy (`/api` prefix injected here),
 * attaching the stored bearer token and JSON headers automatically so call
 * sites only ever pass a backend-relative path.
 */
export async function apiFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T | undefined> {
  const authToken = getAuthToken();
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      ...(init?.headers || {}),
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
    },
  });
  if (!response.ok) {
    throw new ApiError(response.status);
  }

  // A 204, or any 2xx with an empty body (logout, DELETE ...), has nothing to
  // parse - calling response.json() on it would throw a raw SyntaxError that
  // bypasses ApiError and the 401 safety net.
  const rawBody = await response.text();
  if (!rawBody) {
    return undefined;
  }

  return JSON.parse(rawBody) as T;
}
