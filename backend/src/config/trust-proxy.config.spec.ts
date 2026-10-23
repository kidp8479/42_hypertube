// HTTP spec for trustEdgeProxy: the client address and protocol come from the
// proxy's X-Forwarded-* headers, and a client-supplied X-Forwarded-For cannot
// choose the address the rate limiter keys on.
import { Controller, Get, Req } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import type { Request } from 'express';
import request from 'supertest';
import { trustEdgeProxy } from './trust-proxy.config';

@Controller()
class ProbeController {
  @Get('probe')
  probe(@Req() req: Request) {
    return { ip: req.ip, secure: req.secure };
  }
}

describe('trustEdgeProxy', () => {
  const build = async (trust: boolean) => {
    const moduleRef = await Test.createTestingModule({
      controllers: [ProbeController],
    }).compile();
    const app = moduleRef.createNestApplication<NestExpressApplication>();
    if (trust) trustEdgeProxy(app);
    await app.init();
    return app;
  };

  it('reads the address the proxy appended and the forwarded protocol', async () => {
    const app = await build(true);

    const res = await request(app.getHttpServer())
      .get('/probe')
      .set('X-Forwarded-For', '203.0.113.7')
      .set('X-Forwarded-Proto', 'https');

    expect(res.body).toEqual({ ip: '203.0.113.7', secure: true });
    await app.close();
  });

  it('ignores an address the client put in front of the proxy-appended one', async () => {
    const app = await build(true);

    // nginx appends the real peer on the right: "<what the client sent>, <peer>".
    const res = await request(app.getHttpServer())
      .get('/probe')
      .set('X-Forwarded-For', '6.6.6.6, 203.0.113.7');

    expect((res.body as { ip: string }).ip).toBe('203.0.113.7');
    await app.close();
  });

  it('without it the forwarded headers are not trusted at all', async () => {
    const app = await build(false);

    const res = await request(app.getHttpServer())
      .get('/probe')
      .set('X-Forwarded-For', '203.0.113.7')
      .set('X-Forwarded-Proto', 'https');

    const body = res.body as { ip: string; secure: boolean };
    expect(body.ip).not.toBe('203.0.113.7');
    expect(body.secure).toBe(false);
    await app.close();
  });
});
