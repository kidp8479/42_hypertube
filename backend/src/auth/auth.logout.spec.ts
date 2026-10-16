import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { OAuthExchangeService } from './oauth-exchange.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { JwtStrategy } from './strategies/jwt.strategy';

// The 401 / 204 contract of ADR-0008 comes from the global JwtAuthGuard plus
// the route's own status code, so only a real request pipeline can pin it
// (a direct call on the controller skips the guard). No DB: AuthService is
// stubbed and the token is signed here.
describe('POST /auth/logout', () => {
  const secret = 'x'.repeat(32);
  let app: INestApplication<App>;
  let jwt: JwtService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        JwtStrategy,
        { provide: APP_GUARD, useClass: JwtAuthGuard },
        { provide: ConfigService, useValue: { getOrThrow: () => secret } },
        { provide: JwtService, useValue: new JwtService({ secret }) },
        // Only login and the OAuth routes use these; logout touches neither.
        { provide: AuthService, useValue: {} },
        { provide: OAuthExchangeService, useValue: {} },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
    jwt = app.get(JwtService);
  });

  afterAll(async () => {
    await app.close();
  });

  it('rejects a call with no token (401)', async () => {
    await request(app.getHttpServer()).post('/auth/logout').expect(401);
  });

  it('answers 204 with no body for a valid token', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/logout')
      .set('Authorization', `Bearer ${jwt.sign({ sub: 1 })}`)
      .expect(204);

    expect(response.text).toBe('');
  });
});
