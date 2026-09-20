// Credential checking and token issuance, used by AuthController.
import { Injectable, OnModuleInit } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import * as argon2 from 'argon2';
import { randomUUID } from 'node:crypto';
import { JwtService } from '@nestjs/jwt';
import { User } from '../users/entities/user.entity';
import { ARGON2_OPTIONS } from './argon2.config';
import { InjectRepository } from '@nestjs/typeorm';
import { OAuthAccount } from './entities/oauth-account.entity';
import { Repository } from 'typeorm';
import { OAuthProfile } from './strategies/oauth-profile.interface';

/**
 * Credential verification for the login flow. Sits on top of
 * {@link UsersService} and never touches the repository directly.
 */
@Injectable()
export class AuthService implements OnModuleInit {
  /**
   * A valid argon2id hash of a throwaway value, used only to spend the
   * same CPU time on a login attempt for an email that has no account as
   * for one that does (see `validateUser`). Generated at startup so it
   * always matches the current hashing parameters.
   */
  private dummyHash!: string;

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    @InjectRepository(OAuthAccount)
    private readonly oauthAccountRepository: Repository<OAuthAccount>,
  ) {}

  async onModuleInit() {
    this.dummyHash = await argon2.hash(randomUUID(), ARGON2_OPTIONS);
  }

  /**
   * Resolves to the user when the credentials match, `null` otherwise.
   * A wrong password and an unknown email are deliberately
   * indistinguishable - same return value, same response time - so the
   * endpoint can't be used to discover which emails are registered.
   */
  async validateUser(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user || user.password === null) {
      // Verify against a dummy hash so a missing account costs the same
      // time as a real one; the result is irrelevant.
      await argon2.verify(this.dummyHash, password);
      return null;
    }
    const isPasswordValid = await argon2.verify(user.password, password);
    if (!isPasswordValid) {
      return null;
    }
    return user;
  }

  /**
   * Mints a signed access token. The payload carries only `sub` (the user
   * id, per the JWT spec) - profile data is fetched per request, not
   * carried in the token, so a claim can never go stale and grant access
   * (ADR-0002).
   *
   * @param user must already be authenticated - this method does no
   * credential check of its own and trusts its caller.
   */
  async login(user: User): Promise<{ access_token: string }> {
    const payload = { sub: user.id };
    const access_token = await this.jwtService.signAsync(payload);
    return { access_token };
  }

  /**
   * Finds or creates the local `User` behind a verified OAuth identity,
   * then signs them in. Three cases, checked in order:
   * 1. This (provider, providerUserId) pair is already linked - log that
   *    user in, nothing else to do.
   * 2. Not linked yet, but the provider vouches the email is verified -
   *    link to an existing local account with that email if one exists,
   *    otherwise create a fresh one.
   * 3. Not linked and the email isn't verified - create a fresh account
   *    without matching by email (matching an unverified email to an
   *    existing account would let an attacker claim it as their own).
   */
  async loginWithOAuth(
    profile: OAuthProfile,
  ): Promise<{ access_token: string }> {
    const existingAccount = await this.oauthAccountRepository.findOneBy({
      provider: profile.provider,
      providerUserId: profile.providerUserId,
    });
    if (existingAccount) {
      const user = await this.usersService.findOne(existingAccount.userId);
      return this.login(user);
    }

    let user: User | null = null;
    if (profile.emailVerified) {
      user = await this.usersService.findByEmail(profile.email);
    }
    if (!user) {
      user = await this.usersService.createFromOAuth(profile);
    }

    await this.oauthAccountRepository.save(
      this.oauthAccountRepository.create({
        provider: profile.provider,
        providerUserId: profile.providerUserId,
        userId: user.id,
      }),
    );

    return this.login(user);
  }
}
