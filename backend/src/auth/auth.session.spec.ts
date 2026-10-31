// HTTP spec for the session routes: what goes over the wire. Login and the
// code exchange hand out a refresh cookie, /auth/refresh rotates it, and
// /auth/logout (public, it must work with an expired access token) revokes the
// session and clears the cookie. No DB: the services are stubbed.
import { INestApplication, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { OAuthExchangeService } from './oauth-exchange.service';
import { RefreshTokenService } from '../sessions/refresh-token.service';
import { LoginIdentifierThrottlerGuard } from './guards/login-identifier-throttler.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { JwtStrategy } from './strategies/jwt.strategy';

const EXPIRES = new Date('2026-10-30T12:00:00.000Z');
const COOKIE = 'refresh_token';

// All Set-Cookie lines of a response, as one string per cookie.
const setCookies = (res: request.Response): string[] =>
  ([] as string[]).concat(res.headers['set-cookie'] ?? []);

describe('session routes', () => {
  const secret = 'x'.repeat(32);
  let app: INestApplication<App>;
  const refresh = {
    issue: jest.fn(),
    rotate: jest.fn(),
    revokeFamilyOf: jest.fn(),
  };
  const auth = {
    validateUser: jest.fn(),
    login: jest.fn(),
    loginById: jest.fn(),
  };
  const exchange = { redeem: jest.fn() };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        JwtStrategy,
        { provide: APP_GUARD, useClass: JwtAuthGuard },
        { provide: ConfigService, useValue: { getOrThrow: () => secret } },
        { provide: JwtService, useValue: new JwtService({ secret }) },
        { provide: AuthService, useValue: auth },
        { provide: OAuthExchangeService, useValue: exchange },
        { provide: RefreshTokenService, useValue: refresh },
      ],
    })
      // Throttling is covered over HTTP in auth.throttle.spec.ts.
      .overrideGuard(LoginIdentifierThrottlerGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => jest.resetAllMocks());

  describe('POST /auth/login', () => {
    it('answers the access token and sets an HttpOnly, SameSite=Strict refresh cookie', async () => {
      auth.validateUser.mockResolvedValue({ id: 7 });
      auth.login.mockResolvedValue({ access_token: 'the.jwt' });
      refresh.issue.mockResolvedValue({ secret: 'r1', expiresAt: EXPIRES });

      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ identifier: 'ada', password: 'whatever-it-is' })
        .expect(200);

      expect(res.body).toEqual({ access_token: 'the.jwt' });
      const [cookie] = setCookies(res);
      expect(cookie).toContain(`${COOKIE}=r1`);
      expect(cookie).toContain('HttpOnly');
      expect(cookie).toContain('SameSite=Strict');
      expect(cookie).toContain('Path=/auth');
      expect(cookie).toContain('Expires=Fri, 30 Oct 2026 12:00:00 GMT');
    });

    it('keeps the cookie path under the prefix the edge proxy stripped', async () => {
      auth.validateUser.mockResolvedValue({ id: 7 });
      auth.login.mockResolvedValue({ access_token: 'the.jwt' });
      refresh.issue.mockResolvedValue({ secret: 'r1', expiresAt: EXPIRES });

      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .set('X-Forwarded-Prefix', '/api')
        .send({ identifier: 'ada', password: 'whatever-it-is' });

      expect(setCookies(res)[0]).toContain('Path=/api/auth');
    });
  });

  describe('POST /auth/refresh', () => {
    it('rotates the cookie token: a new access token and the next cookie', async () => {
      refresh.rotate.mockResolvedValue({
        userId: 7,
        secret: 'r2',
        expiresAt: EXPIRES,
      });
      auth.loginById.mockResolvedValue({ access_token: 'new.jwt' });

      const res = await request(app.getHttpServer())
        .post('/auth/refresh')
        .set('Cookie', `${COOKIE}=r1`)
        .expect(200);

      expect(refresh.rotate).toHaveBeenCalledWith('r1');
      expect(res.body).toEqual({ access_token: 'new.jwt' });
      expect(setCookies(res)[0]).toContain(`${COOKIE}=r2`);
    });

    it('is 204 with no body when there is no cookie, and looks nothing up', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/refresh')
        .expect(204);

      expect(res.text).toBe('');

      expect(refresh.rotate).not.toHaveBeenCalled();
    });

    it('is 401 and clears the cookie when the token is not accepted', async () => {
      refresh.rotate.mockRejectedValue(new UnauthorizedException());

      const res = await request(app.getHttpServer())
        .post('/auth/refresh')
        .set('Cookie', `${COOKIE}=stale`)
        .expect(401);

      expect(setCookies(res)[0]).toMatch(
        new RegExp(`^${COOKIE}=; Path=/auth; Expires=Thu, 01 Jan 1970`),
      );
    });
  });

  describe('POST /auth/logout', () => {
    it('is public: 204 with no body even with no access token at all', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/logout')
        .expect(204);

      expect(res.text).toBe('');
      expect(refresh.revokeFamilyOf).not.toHaveBeenCalled();
    });

    it('revokes the session of the refresh cookie and clears it', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Cookie', `${COOKIE}=r1`)
        .expect(204);

      expect(refresh.revokeFamilyOf).toHaveBeenCalledWith('r1');
      expect(setCookies(res)[0]).toMatch(
        new RegExp(`^${COOKIE}=; Path=/auth; Expires=Thu, 01 Jan 1970`),
      );
    });
  });
});
