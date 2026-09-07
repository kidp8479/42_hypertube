// The single fetch wrapper every API call in the app goes through.
import { getAuthToken } from './token';

const NO_CONTENT = 204;
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
  if (response.status === NO_CONTENT) {
    return undefined;
  }

  if (!response.ok) {
    throw new ApiError(response.status);
  }

  return (await response.json()) as T;
}
