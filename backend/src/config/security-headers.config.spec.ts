// HTTP spec for securityHeaders: helmet's headers on every response, error
// responses included, minus the three the edge proxy owns.
import { Controller, Get, NotFoundException } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { securityHeaders } from './security-headers.config';

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

describe('securityHeaders', () => {
  let app: NestExpressApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [ProbeController],
    }).compile();
    app = moduleRef.createNestApplication<NestExpressApplication>();
    securityHeaders(app);
    await app.init();
  });

  afterAll(() => app.close());

  it.each(['/probe', '/missing', '/no-such-route'])(
    'sends a CSP that forbids framing on %p',
    async (path) => {
      const res = await request(app.getHttpServer()).get(path);
      const csp = res.headers['content-security-policy'];
      expect(csp).toContain("default-src 'self'");
      expect(csp).toContain("script-src 'self'");
      expect(csp).toContain("frame-ancestors 'none'");
      expect(csp).not.toContain('upgrade-insecure-requests');
      expect(res.headers['referrer-policy']).toBe('no-referrer');
    },
  );

  it('leaves HSTS, frame options and nosniff to the edge proxy', async () => {
    const res = await request(app.getHttpServer()).get('/probe');
    expect(res.headers['strict-transport-security']).toBeUndefined();
    expect(res.headers['x-frame-options']).toBeUndefined();
    expect(res.headers['x-content-type-options']).toBeUndefined();
  });
});
