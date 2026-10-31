// The API key calls (`/api-clients`, ADR-0015), kept out of the components.
import { apiFetch } from '../../lib/api';

/** An API key as `GET /api-clients` lists it: never its secret. */
export interface ApiKey {
  id: number;
  name: string;
  clientId: string;
  createdAt: string;
}

/** A key just created: the only answer that carries its `secret`. */
export interface CreatedApiKey extends ApiKey {
  secret: string;
}

/** The caller's keys. */
export async function listApiKeys(): Promise<ApiKey[]> {
  return (await apiFetch<ApiKey[]>('/api-clients')) ?? [];
}

/** Creates a key named `name`; resolves to it, secret included. */
export async function createApiKey(name: string): Promise<CreatedApiKey> {
  const created = await apiFetch<CreatedApiKey>('/api-clients', {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
  if (!created) {
    throw new Error('POST /api-clients answered with no body');
  }
  return created;
}

/** Revokes one of the caller's keys. */
export async function revokeApiKey(id: number): Promise<void> {
  await apiFetch(`/api-clients/${id}`, { method: 'DELETE' });
}
