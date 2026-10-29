// HTTP spec for noStoreResponses: every response tells the browser not to
// keep it, error responses included.
import { Controller, Get, NotFoundException } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { noStoreResponses } from './no-store.config';

@Controller()
class ProbeController {
  @Get('probe')
  probe() {
    return { ok: true };
  }

  @Get('missing')
  missing() {
    throw new NotFoundException();
  }
}

describe('noStoreResponses', () => {
  let app: NestExpressApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [ProbeController],
    }).compile();
    app = moduleRef.createNestApplication<NestExpressApplication>();
    noStoreResponses(app);
    await app.init();
  });

  afterAll(() => app.close());

  it.each(['/probe', '/missing', '/no-such-route'])(
    'marks %p as not to be stored',
    async (path) => {
      const res = await request(app.getHttpServer()).get(path);
      expect(res.headers['cache-control']).toBe('no-store');
    },
  );
});
