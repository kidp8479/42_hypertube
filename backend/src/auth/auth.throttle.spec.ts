// HTTP spec for the brute-force ceilings on POST /auth/login (429 after 5
// attempts in the window, per IP and per account).
import type { NestExpressApplication } from '@nestjs/platform-express';
import { APP_GUARD } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import request from 'supertest';
import { trustEdgeProxy } from '../config/trust-proxy.config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { OAuthExchangeService } from './oauth-exchange.service';
import { RefreshTokenService } from '../sessions/refresh-token.service';

// The @Throttle limit on POST /auth/login only takes effect over HTTP
// through ThrottlerGuard, so this drives a real request pipeline with a
// stubbed AuthService (no DB, no JWT).
describe('POST /auth/login throttling', () => {
  let app: NestExpressApplication;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }])],
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: { validateUser: jest.fn() } },
        // Only the OAuth callbacks use these; login never touches them.
        { provide: OAuthExchangeService, useValue: {} },
        { provide: RefreshTokenService, useValue: { issue: jest.fn() } },
        { provide: ConfigService, useValue: {} },
        { provide: APP_GUARD, useClass: ThrottlerGuard },
      ],
    }).compile();

    app = moduleRef.createNestApplication<NestExpressApplication>();
    // Lets each request pick its client IP through X-Forwarded-For.
    trustEdgeProxy(app);
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('returns 429 on the 6th attempt from one IP, whatever the account', async () => {
    const server = app.getHttpServer();
    // A fresh identifier each time: only the per-IP counter can trip.
    const attempt = (i: number) =>
      request(server)
        .post('/auth/login')
        .send({ identifier: `ada${i}`, password: 'whatever' });

    for (let i = 0; i < 5; i++) {
      await attempt(i).expect(401);
    }
    await attempt(5).expect(429);
  });

  it('returns 429 on the 6th attempt on one identifier, whatever the IP', async () => {
    const server = app.getHttpServer();
    // Case and surrounding spaces do not open a fresh counter.
    const spellings = ['ada', 'Ada', ' ada ', 'ADA', 'ada'];

    for (const [i, identifier] of spellings.entries()) {
      await request(server)
        .post('/auth/login')
        .set('X-Forwarded-For', `198.51.100.${i}`)
        .send({ identifier, password: 'whatever' })
        .expect(401)
        // The headers show the caller's own IP counter, never how many
        // attempts others made on this identifier.
        .expect('X-RateLimit-Remaining', '4');
    }
    await request(server)
      .post('/auth/login')
      .set('X-Forwarded-For', '198.51.100.99')
      .send({ identifier: 'ada', password: 'whatever' })
      .expect(429);
    // Another account is still reachable: the counter is per identifier.
    await request(server)
      .post('/auth/login')
      .set('X-Forwarded-For', '198.51.100.98')
      .send({ identifier: 'grace', password: 'whatever' })
      .expect(401);
  });
});
