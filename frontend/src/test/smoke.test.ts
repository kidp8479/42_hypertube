import { describe, expect, it } from 'vitest';

// Proves the Vitest runner, jsdom env and setup file are wired up. Replace
// with real coverage as the auth infra lands.
describe('test setup', () => {
  it('runs in a jsdom environment', () => {
    expect(typeof window).toBe('object');
    expect(localStorage).toBeDefined();
  });
});
