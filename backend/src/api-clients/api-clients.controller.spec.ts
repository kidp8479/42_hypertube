// HTTP spec for /api-clients: what goes on the wire (the secret only on
// creation, never the hash) and the 403 for an API client token.
import {
  ClassSerializerInterceptor,
  ExecutionContext,
  INestApplication,
} from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR, Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import type { AuthUser } from '../common/decorators/current-user.decorator';
import { globalValidationPipe } from '../common/pipes/global-validation.pipe';
import { ApiClientsController } from './api-clients.controller';
import { ApiClientsService } from './api-clients.service';
import { ApiClient } from './entities/api-client.entity';

// Who the stub guard says is calling; a test switches it to a client token.
let caller: AuthUser = { id: 7 };
const stubAuthGuard = {
  canActivate: (context: ExecutionContext) => {
    context.switchToHttp().getRequest<{ user?: AuthUser }>().user = caller;
    return true;
  },
};

// A full row, hash included: the exact-keys assertions fail if it leaks.
const row = Object.assign(new ApiClient(), {
  id: 3,
  userId: 7,
  name: 'script',
  clientId: 'htc_0123456789abcdef01234567',
  secretHash: 'f'.repeat(64),
  createdAt: new Date('2026-01-01T00:00:00Z'),
});

describe('ApiClientsController', () => {
  let app: INestApplication<App>;
  const apiClients = {
    create: jest.fn(),
    listFor: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    caller = { id: 7 };
    const moduleRef = await Test.createTestingModule({
      controllers: [ApiClientsController],
      providers: [
        { provide: ApiClientsService, useValue: apiClients },
        { provide: APP_GUARD, useValue: stubAuthGuard },
        {
          provide: APP_INTERCEPTOR,
          useFactory: (reflector: Reflector) =>
            new ClassSerializerInterceptor(reflector),
          inject: [Reflector],
        },
      ],
    }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(globalValidationPipe());
    await app.init();
  });

  afterEach(() => app.close());

  it('answers the new key with its secret, never the hash', async () => {
    apiClients.create.mockResolvedValue({ client: row, secret: 's3cret' });

    const res = await request(app.getHttpServer())
      .post('/api-clients')
      .send({ name: 'script' })
      .expect(201);

    expect(Object.keys(res.body as object).sort()).toEqual([
      'clientId',
      'createdAt',
      'id',
      'name',
      'secret',
    ]);
    expect(apiClients.create).toHaveBeenCalledWith(7, 'script');
  });

  it('lists the keys without secret or hash', async () => {
    apiClients.listFor.mockResolvedValue([row]);

    const res = await request(app.getHttpServer())
      .get('/api-clients')
      .expect(200);

    expect(Object.keys((res.body as object[])[0]).sort()).toEqual([
      'clientId',
      'createdAt',
      'id',
      'name',
    ]);
  });

  it('refuses an empty name with 400', async () => {
    await request(app.getHttpServer())
      .post('/api-clients')
      .send({ name: '  ' })
      .expect(400);
  });

  it.each([
    ['post', '/api-clients'],
    ['get', '/api-clients'],
    ['delete', '/api-clients/3'],
  ] as const)(
    'refuses %s %s to an API client token with 403',
    async (method, path) => {
      caller = { id: 7, apiClientId: 3 };

      await request(app.getHttpServer())
        [method](path)
        .send({ name: 'minted' })
        .expect(403);
      expect(apiClients.create).not.toHaveBeenCalled();
      expect(apiClients.remove).not.toHaveBeenCalled();
    },
  );
});
