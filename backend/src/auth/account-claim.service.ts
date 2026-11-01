// Everything an OAuth login revokes when it claims an unverified account.
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UsersService } from '../users/users.service';
import { RefreshTokenService } from '../sessions/refresh-token.service';
import { ApiClientsService } from '../api-clients/api-clients.service';
import { OAuthAccount } from './entities/oauth-account.entity';

/**
 * Hands an unverified account over to the owner of its email (ADR-0007).
 * Neither a local registration nor an email change checks the address, so
 * whoever put that email on the account may still hold a way in: a
 * password, a browser session, an API key, a provider link of their own.
 * {@link AccountClaimService.claim} removes each of them, and is the one
 * place to extend when a new kind of credential appears.
 */
@Injectable()
export class AccountClaimService {
  constructor(
    private readonly usersService: UsersService,
    private readonly refreshTokens: RefreshTokenService,
    private readonly apiClients: ApiClientsService,
    @InjectRepository(OAuthAccount)
    private readonly oauthAccountRepository: Repository<OAuthAccount>,
  ) {}

  /**
   * Drops the password and marks the email verified, then revokes the
   * sessions, the API keys and the provider links. The caller links the new
   * identity only after this resolves, so a failure part-way never leaves
   * the account linked with the old access intact.
   */
  async claim(userId: number): Promise<void> {
    await this.usersService.claimEmail(userId);
    await this.refreshTokens.revokeAllForUser(userId);
    await this.apiClients.revokeAllForUser(userId);
    await this.oauthAccountRepository.delete({ userId });
  }
}
