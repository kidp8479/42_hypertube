// Unit spec for the key the per-identifier login throttle counts on. The
// 429 itself is covered over HTTP in auth.throttle.spec.ts.
import { Reflector } from '@nestjs/core';
import type { ThrottlerStorage } from '@nestjs/throttler';
import type { Request } from 'express';
import { LoginIdentifierThrottlerGuard } from './login-identifier-throttler.guard';

class ProbeGuard extends LoginIdentifierThrottlerGuard {
  trackerFor(body: unknown): Promise<string> {
    return this.getTracker({ body, ip: '203.0.113.7' } as Request);
  }
}

describe('LoginIdentifierThrottlerGuard key', () => {
  const guard = new ProbeGuard([], {} as ThrottlerStorage, new Reflector());

  it('folds case and surrounding whitespace into one counter', async () => {
    const keys = await Promise.all(
      ['ada', 'Ada', '  ADA ', 'ada\t'].map((identifier) =>
        guard.trackerFor({ identifier }),
      ),
    );
    expect(new Set(keys)).toEqual(new Set(['login:ada']));
  });

  it('keeps different identifiers apart', async () => {
    expect(await guard.trackerFor({ identifier: 'ada' })).not.toBe(
      await guard.trackerFor({ identifier: 'grace' }),
    );
  });

  it.each([undefined, {}, { identifier: 42 }, { identifier: ['ada'] }])(
    'gives a malformed body %p the empty key',
    async (body) => {
      expect(await guard.trackerFor(body)).toBe('login:');
    },
  );

  it('never collides with the per-IP key of the same text', async () => {
    expect(await guard.trackerFor({ identifier: '203.0.113.7' })).not.toBe(
      '203.0.113.7',
    );
  });
});
