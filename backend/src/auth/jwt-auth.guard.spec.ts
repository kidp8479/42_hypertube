import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from './jwt-auth.guard';

const context = {
  getHandler: () => ({}),
  getClass: () => ({}),
} as unknown as ExecutionContext;

describe('JwtAuthGuard', () => {
  // The non-public path is passport's own AuthGuard code; only the
  // @Public() short-circuit is ours to test.
  it('lets a @Public() route through without touching the token', () => {
    const reflector = { getAllAndOverride: () => true } as unknown as Reflector;

    expect(new JwtAuthGuard(reflector).canActivate(context)).toBe(true);
  });
});
