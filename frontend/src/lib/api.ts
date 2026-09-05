import { getAuthToken } from './token';

const NO_CONTENT = 204;

export class ApiError extends Error {
  status: number;

  constructor(status: number, message?: string) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}

export async function apiFetch(
  path: string,
  init?: RequestInit,
): Promise<unknown> {
  const authToken = getAuthToken();
  const response = await fetch(path, {
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

  return await response.json();
}
