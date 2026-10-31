// Unit spec for JwtStrategy: the verified payload becomes a minimal req.user.
import { ConfigService } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy', () => {
  const strategy = new JwtStrategy({
    getOrThrow: () => 'a'.repeat(32),
  } as unknown as ConfigService);

  it('maps a verified payload to a minimal req.user', () => {
    expect(strategy.validate({ sub: 7 })).toEqual({ id: 7 });
  });

  it('keeps the API client a token was issued to', () => {
    expect(strategy.validate({ sub: 7, cid: 3 })).toEqual({
      id: 7,
      apiClientId: 3,
    });
  });
});
