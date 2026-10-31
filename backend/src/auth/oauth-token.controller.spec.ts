// HTTP spec for POST /oauth/token: the subject's field names, JSON or
// form-encoded, and the optional grant_type.
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { globalValidationPipe } from '../common/pipes/global-validation.pipe';
import { OAuthTokenController } from './oauth-token.controller';
import { OAuthTokenService } from './oauth-token.service';

describe('OAuthTokenController', () => {
  let app: INestApplication<App>;
  const oauthTokens = {
    issue: jest.fn().mockResolvedValue({
      access_token: 'jwt',
      token_type: 'Bearer',
      expires_in: 900,
    }),
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [OAuthTokenController],
      providers: [{ provide: OAuthTokenService, useValue: oauthTokens }],
    }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(globalValidationPipe());
    await app.init();
  });

  afterAll(() => app.close());

  it('takes client + secret as JSON and answers 200', async () => {
    await request(app.getHttpServer())
      .post('/oauth/token')
      .send({ client: 'htc_x', secret: 's' })
      .expect(200, {
        access_token: 'jwt',
        token_type: 'Bearer',
        expires_in: 900,
      });
    expect(oauthTokens.issue).toHaveBeenCalledWith('htc_x', 's');
  });

  it('takes a form-encoded body with grant_type', async () => {
    await request(app.getHttpServer())
      .post('/oauth/token')
      .type('form')
      .send({ grant_type: 'client_credentials', client: 'htc_x', secret: 's' })
      .expect(200);
  });

  it.each([
    ['another grant', { grant_type: 'password', client: 'htc_x', secret: 's' }],
    ['no secret', { client: 'htc_x' }],
  ])('refuses %s with 400', async (_case, body) => {
    await request(app.getHttpServer())
      .post('/oauth/token')
      .send(body)
      .expect(400);
  });
});
