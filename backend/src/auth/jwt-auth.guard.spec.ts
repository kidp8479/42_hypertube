import {
  Controller,
  ExecutionContext,
  Get,
  INestApplication,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD, Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { JwtAuthGuard } from './jwt-auth.guard';
import { JwtStrategy } from './jwt.strategy';
import { Public } from './public.decorator';

const context = {
  getHandler: () => ({}),
  getClass: () => ({}),
} as unknown as ExecutionContext;

describe('JwtAuthGuard', () => {
  // The non-public path is passport's own AuthGuard code; only the
  // @Public() short-circuit is ours to unit-test.
  it('lets a @Public() route through without touching the token', () => {
    const reflector = { getAllAndOverride: () => true } as unknown as Reflector;

    expect(new JwtAuthGuard(reflector).canActivate(context)).toBe(true);
  });

  describe('wired globally over HTTP', () => {
    const secret = 'x'.repeat(32);
    let app: INestApplication<App>;
    let jwt: JwtService;

    @Controller()
    class ProbeController {
      @Get('protected')
      protected() {
        return 'ok';
      }

      @Public()
      @Get('open')
      open() {
        return 'ok';
      }
    }

    beforeAll(async () => {
      const moduleRef = await Test.createTestingModule({
        controllers: [ProbeController],
        providers: [
          JwtStrategy,
          { provide: APP_GUARD, useClass: JwtAuthGuard },
          {
            provide: ConfigService,
            useValue: { getOrThrow: () => secret },
          },
          { provide: JwtService, useValue: new JwtService({ secret }) },
        ],
      }).compile();

      app = moduleRef.createNestApplication();
      await app.init();
      jwt = app.get(JwtService);
    });

    afterAll(async () => {
      await app.close();
    });

    it('rejects a protected route with no token (401)', async () => {
      await request(app.getHttpServer()).get('/protected').expect(401);
    });

    it('rejects a protected route with a bad token (401)', async () => {
      await request(app.getHttpServer())
        .get('/protected')
        .set('Authorization', 'Bearer not-a-jwt')
        .expect(401);
    });

    it('allows a protected route with a valid token (200)', async () => {
      const token = jwt.sign({ sub: 1 });
      await request(app.getHttpServer())
        .get('/protected')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
    });

    it('allows a @Public() route with no token (200)', async () => {
      await request(app.getHttpServer()).get('/open').expect(200);
    });
  });
});
