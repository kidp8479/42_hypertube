import {
  Controller,
  Get,
  INestApplication,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
  UseFilters,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { UnverifiedEmailException } from '../exceptions/unverified-email.exception';
import { OAuthCallbackFilter } from './oauth-callback.filter';

const SPA = 'http://localhost:5173/oauth/callback';

@Controller()
@UseFilters(OAuthCallbackFilter)
class ProbeController {
  @Get('rejected')
  rejected() {
    throw new UnauthorizedException();
  }

  @Get('unverified')
  unverified() {
    throw new UnverifiedEmailException();
  }

  @Get('unavailable')
  unavailable() {
    throw new ServiceUnavailableException('provider down');
  }

  @Get('crashed')
  crashed() {
    throw new Error('provider unreachable');
  }
}

describe('OAuthCallbackFilter', () => {
  let app: INestApplication<App>;
  let logError: jest.SpyInstance;
  let logWarn: jest.SpyInstance;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [ProbeController],
      providers: [
        {
          provide: ConfigService,
          useValue: { getOrThrow: () => 'http://localhost:5173' },
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  beforeEach(() => {
    logError = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
    logWarn = jest
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation(() => undefined);
  });

  afterEach(() => {
    logError.mockRestore();
    logWarn.mockRestore();
  });

  afterAll(async () => {
    await app.close();
  });

  it('redirects a declined consent to the SPA as cancelled', async () => {
    const res = await request(app.getHttpServer())
      .get('/rejected?error=access_denied')
      .expect(302);

    expect(res.headers.location).toBe(`${SPA}?error=cancelled`);
  });

  it('expires the state cookie on its redirect', async () => {
    const res = await request(app.getHttpServer())
      .get('/rejected?error=access_denied')
      .expect(302);

    const cookies = ([] as string[]).concat(res.headers['set-cookie'] ?? []);
    expect(cookies).toEqual([
      expect.stringMatching(
        /^oauth_state=;.*Path=\/auth;.*Expires=Thu, 01 Jan 1970/,
      ),
    ]);
  });

  it('redirects any other rejection as failed, without logging it', async () => {
    const res = await request(app.getHttpServer()).get('/rejected').expect(302);

    expect(res.headers.location).toBe(`${SPA}?error=failed`);
    expect(res.headers['referrer-policy']).toBe('no-referrer');
    expect(logError).not.toHaveBeenCalled();
  });

  it('redirects a provider account with no verified email as email_unverified, with a warning', async () => {
    const res = await request(app.getHttpServer())
      .get('/unverified')
      .expect(302);

    expect(res.headers.location).toBe(`${SPA}?error=email_unverified`);
    expect(logWarn).toHaveBeenCalled();
    expect(logError).not.toHaveBeenCalled();
  });

  it('logs a 5xx HttpException as an error', async () => {
    const res = await request(app.getHttpServer())
      .get('/unavailable')
      .expect(302);

    expect(res.headers.location).toBe(`${SPA}?error=failed`);
    expect(logError).toHaveBeenCalledWith(
      expect.stringContaining('provider down'),
    );
  });

  it('redirects an unexpected error as failed and logs it', async () => {
    const res = await request(app.getHttpServer()).get('/crashed').expect(302);

    expect(res.headers.location).toBe(`${SPA}?error=failed`);
    expect(logError).toHaveBeenCalledWith(
      expect.stringContaining('provider unreachable'),
    );
  });
});
