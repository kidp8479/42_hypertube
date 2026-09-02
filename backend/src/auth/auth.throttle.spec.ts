import { INestApplication } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import request from 'supertest';
import { App } from 'supertest/types';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

// The @Throttle limit on POST /auth/login only takes effect over HTTP
// through ThrottlerGuard, so this drives a real request pipeline with a
// stubbed AuthService (no DB, no JWT).
describe('POST /auth/login throttling', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }])],
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: { validateUser: jest.fn() } },
        { provide: APP_GUARD, useClass: ThrottlerGuard },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('returns 429 after 5 attempts in the window', async () => {
    const server = app.getHttpServer();
    const body = { email: 'ada@example.com', password: 'whatever' };

    for (let i = 0; i < 5; i++) {
      await request(server).post('/auth/login').send(body).expect(401);
    }
    await request(server).post('/auth/login').send(body).expect(429);
  });
});
