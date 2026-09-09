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

  // Build on a real `Headers` so a caller passing a `Headers` instance or a
  // tuple array is preserved (object spread would drop those). Only claim a
  // JSON content type for a string body - a `FormData` body must keep the
  // browser-generated multipart boundary.
  const headers = new Headers(init?.headers);
  if (authToken) {
    headers.set('Authorization', `Bearer ${authToken}`);
  }
  if (typeof init?.body === 'string') {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${API_BASE}${path}`, { ...init, headers });
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
