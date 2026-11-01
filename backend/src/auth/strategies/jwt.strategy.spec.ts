// Unit spec for JwtStrategy: a verified payload becomes a minimal req.user,
// unless its account is gone or its credentials changed after it was issued.
import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy';
import { UsersService } from '../../users/users.service';

describe('JwtStrategy', () => {
  const findCredentialsChangedAt = jest.fn();
  const strategy = new JwtStrategy(
    { getOrThrow: () => 'a'.repeat(32) } as unknown as ConfigService,
    { findCredentialsChangedAt } as unknown as UsersService,
  );
  // 2026-11-01T12:00:00Z, in the seconds a token's `iat` counts.
  const changedAt = new Date('2026-11-01T12:00:00.600Z');
  const changedAtSeconds = Math.floor(changedAt.getTime() / 1000);

  beforeEach(() => {
    findCredentialsChangedAt.mockReset();
  });

  it('maps a verified payload to a minimal req.user', async () => {
    findCredentialsChangedAt.mockResolvedValue({ credentialsChangedAt: null });

    await expect(strategy.validate({ sub: 7, iat: 1 })).resolves.toEqual({
      id: 7,
    });
    expect(findCredentialsChangedAt).toHaveBeenCalledWith(7);
  });

  it('keeps the API client a token was issued to', async () => {
    findCredentialsChangedAt.mockResolvedValue({ credentialsChangedAt: null });

    await expect(
      strategy.validate({ sub: 7, cid: 3, iat: 1 }),
    ).resolves.toEqual({ id: 7, apiClientId: 3 });
  });

  it('refuses a token whose account no longer exists', async () => {
    findCredentialsChangedAt.mockResolvedValue(null);

    await expect(strategy.validate({ sub: 7, iat: 1 })).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('refuses a token issued before the credentials changed (an OAuth claim)', async () => {
    findCredentialsChangedAt.mockResolvedValue({
      credentialsChangedAt: changedAt,
    });

    await expect(
      strategy.validate({ sub: 7, iat: changedAtSeconds - 1 }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('accepts a token issued in the same second as the change, or after', async () => {
    // `iat` has no milliseconds: a token minted right after the claim may
    // carry the claim's second, and must not lock its new owner out.
    findCredentialsChangedAt.mockResolvedValue({
      credentialsChangedAt: changedAt,
    });

    await expect(
      strategy.validate({ sub: 7, iat: changedAtSeconds }),
    ).resolves.toEqual({ id: 7 });
    await expect(
      strategy.validate({ sub: 7, iat: changedAtSeconds + 60 }),
    ).resolves.toEqual({ id: 7 });
  });
});
