// The API key list and the writes that change it.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createApiKey, listApiKeys, revokeApiKey } from './api-keys-actions';

const API_KEYS = ['api-keys'] as const;

/** The caller's keys (`GET /api-clients`). */
export function useApiKeys() {
  return useQuery({ queryKey: API_KEYS, queryFn: listApiKeys });
}

/**
 * Creating and revoking a key, each refreshing the list once it answered.
 * The created key, secret included, lives in the mutation's result only: it
 * is never put in the list's cache.
 */
export function useApiKeyWrites() {
  const queryClient = useQueryClient();
  const refresh = () => queryClient.invalidateQueries({ queryKey: API_KEYS });
  const create = useMutation({ mutationFn: createApiKey, onSuccess: refresh });
  const revoke = useMutation({ mutationFn: revokeApiKey, onSuccess: refresh });
  return { create, revoke };
}
