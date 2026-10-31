// Unit spec for OAuthTokenService: an API key buys a token for its owner,
// marked with the key, and a bad key buys nothing.
import { UnauthorizedException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { ApiClientsService } from '../api-clients/api-clients.service';
import { OAuthTokenService } from './oauth-token.service';

describe('OAuthTokenService', () => {
  const jwt = new JwtService({ secret: 'a'.repeat(32) });
  const apiClients = { verify: jest.fn() };
  const service = new OAuthTokenService(
    apiClients as unknown as ApiClientsService,
    jwt,
    { getOrThrow: () => '15m' } as unknown as ConfigService,
  );

  it("signs a token for the key's owner, carrying the key", async () => {
    apiClients.verify.mockResolvedValue({ id: 3, userId: 7 });

    const res = await service.issue('htc_x', 'the-secret');

    expect(res.token_type).toBe('Bearer');
    expect(res.expires_in).toBe(900);
    expect(jwt.verify(res.access_token)).toMatchObject({ sub: 7, cid: 3 });
    expect(apiClients.verify).toHaveBeenCalledWith('htc_x', 'the-secret');
  });

  it('answers 401 when the client or the secret is wrong', async () => {
    apiClients.verify.mockResolvedValue(undefined);

    await expect(service.issue('htc_x', 'wrong')).rejects.toThrow(
      UnauthorizedException,
    );
  });
});
