import { ConfigService } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy', () => {
  const strategy = new JwtStrategy({
    getOrThrow: () => 'a'.repeat(32),
  } as unknown as ConfigService);

  it('maps a verified payload to a minimal req.user', () => {
    expect(strategy.validate({ sub: 7 })).toEqual({ id: 7 });
  });
});
