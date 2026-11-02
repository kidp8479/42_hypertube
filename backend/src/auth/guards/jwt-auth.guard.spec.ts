// Spec for JwtAuthGuard wired globally over HTTP: 401 without a valid token
// or with one issued before its account changed hands, 200 with a valid one,
// and @Public() routes open to everyone.
import { Controller, Get, INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { JwtAuthGuard } from './jwt-auth.guard';
import { JwtStrategy } from '../strategies/jwt.strategy';
import { Public } from '../../common/decorators/public.decorator';
import { UsersService } from '../../users/users.service';
import { ApiClientsService } from '../../api-clients/api-clients.service';

describe('JwtAuthGuard', () => {
  describe('wired globally over HTTP', () => {
    const secret = 'x'.repeat(32);
    let app: INestApplication<App>;
    let jwt: JwtService;
    let credentialsChangedAt: Date | null = null;

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
          {
            provide: UsersService,
            useValue: {
              findCredentialsChangedAt: () =>
                Promise.resolve({ credentialsChangedAt }),
            },
          },
          {
            provide: ApiClientsService,
            useValue: { exists: () => Promise.resolve(true) },
          },
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

    it('rejects a token issued before its account changed hands (401)', async () => {
      const token = jwt.sign({ sub: 1 });
      credentialsChangedAt = new Date(Date.now() + 2_000);

      try {
        await request(app.getHttpServer())
          .get('/protected')
          .set('Authorization', `Bearer ${token}`)
          .expect(401);
      } finally {
        credentialsChangedAt = null;
      }
    });

    it('allows a @Public() route with no token (200)', async () => {
      await request(app.getHttpServer()).get('/open').expect(200);
    });
  });
});
