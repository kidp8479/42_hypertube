import { describe, it, expect } from 'vitest';
import { getAuthToken, setAuthToken, removeAuthToken } from './token';

describe('Auth Token Management', () => {
  describe('token', () => {
    it('returns null when no token is stored', () => {
      expect(getAuthToken()).toBeNull();
    });

    it('stores and retrieves a token', () => {
      const token = 'test-token';
      setAuthToken(token);
      expect(getAuthToken()).toBe(token);
    });

    it('removes a stored token', () => {
      const token = 'test-token';
      setAuthToken(token);
      removeAuthToken();
      expect(getAuthToken()).toBeNull();
    });
  });
});
