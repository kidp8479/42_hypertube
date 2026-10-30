// Credential checking, token issuance and OAuth account resolution, used by
// AuthController.
import {
  Injectable,
  NotFoundException,
  OnModuleInit,
  UnauthorizedException,
} from '@nestjs/common';
import { UsersService } from '../users/users.service';
import * as argon2 from 'argon2';
import { randomUUID } from 'node:crypto';
import { JwtService } from '@nestjs/jwt';
import { User } from '../users/entities/user.entity';
import { ARGON2_OPTIONS } from '../config/argon2.config';
import { InjectRepository } from '@nestjs/typeorm';
import { OAuthAccount } from './entities/oauth-account.entity';
import { Repository } from 'typeorm';
import { OAuthProfile } from './strategies/oauth-profile.interface';
import { normalizeEmail } from '../common/utils/normalize-email.util';
import { isUniqueViolation } from '../common/utils/unique-violation.util';
import { RefreshTokenService } from './refresh-token.service';

/**
 * Credential verification and token issuance for the login flow, plus the
 * OAuth identity -> local user resolution. Goes through {@link UsersService}
 * for `User` rows; it only holds the `OAuthAccount` repository itself.
 */
@Injectable()
export class AuthService implements OnModuleInit {
  /**
   * A valid argon2id hash of a throwaway value, used only to spend the
   * same CPU time on a login attempt for an identifier that matches no account as
   * for one that does (see `validateUser`). Generated at startup so it
   * always matches the current hashing parameters.
   */
  private dummyHash!: string;

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    @InjectRepository(OAuthAccount)
    private readonly oauthAccountRepository: Repository<OAuthAccount>,
    private readonly refreshTokens: RefreshTokenService,
  ) {}

  async onModuleInit() {
    this.dummyHash = await argon2.hash(randomUUID(), ARGON2_OPTIONS);
  }

  /**
   * Resolves to the user when the credentials match, `null` otherwise.
   * A wrong password and an unknown username or email are deliberately
   * indistinguishable - same return value, same response time - so the
   * endpoint can't be used to discover which accounts exist.
   */
  async validateUser(identifier: string, password: string) {
    const user = await this.usersService.findForLogin(identifier);
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
   * Signs a token for a user known only by id, i.e. one resolved earlier
   * by the OAuth handshake and carried here through an exchange code.
   * Loads the user first rather than signing the bare id, so a user
   * deleted since the code was issued gets no token.
   *
   * @throws {UnauthorizedException} 401 when the user no longer exists:
   * the exchange answers the same for every bad code, and a 404 would
   * reveal that this id once existed.
   */
  async loginById(userId: number): Promise<{ access_token: string }> {
    try {
      return this.login(await this.usersService.findOne(userId));
    } catch (err) {
      if (err instanceof NotFoundException) {
        throw new UnauthorizedException();
      }
      throw err;
    }
  }

  /**
   * Finds or creates the local `User` behind a verified OAuth identity.
   * It does not sign anyone in: the caller hands the user over through a
   * single-use exchange code, and the JWT is minted when that code is
   * redeemed (ADR-0007). Two cases, checked in order:
   * 1. This (provider, providerUserId) pair is already linked - that user,
   *    nothing else to do.
   * 2. Not linked yet - link to an existing account with that email if one
   *    exists (claiming it first when its email is unverified, see below),
   *    otherwise create a fresh one. The email is provider-verified
   *    (`OAuthProfile.email`).
   *
   * Claiming an unverified account: neither a local registration nor an
   * email change checks the address, so an attacker could put a victim's
   * email on an account they hold, by a password, a session or a provider
   * of their own. When the real owner signs in through a provider, the
   * account becomes theirs alone: its password, its sessions and its other
   * provider links are revoked, and its email is marked verified. The
   * owner sets a new password through the reset flow. A verified account
   * is linked as is: a provider already vouched for that email.
   *
   * `profile.email` is normalized here rather than trusted as-is: unlike
   * `CreateUserDto`, it never passes through the validation
   * pipe's `@NormalizeEmail`, so a provider returning a different casing
   * than the one a local account was registered with would otherwise
   * dodge the case-insensitive match in case 2 and create a duplicate
   * account instead of linking to the existing one.
   *
   * A unique violation (a concurrent first login, registration or
   * sign-up won the race to insert) runs the whole resolution once more,
   * so the winner's rows go through the normal path instead of a 409. A
   * second violation is rethrown (ADR-0007, 2026-10-25 amendment).
   */
  async resolveOAuthUser(profile: OAuthProfile): Promise<User> {
    try {
      return await this.resolveOAuthUserOnce(profile);
    } catch (err) {
      if (!isUniqueViolation(err)) {
        throw err;
      }
      return this.resolveOAuthUserOnce(profile);
    }
  }

  private async resolveOAuthUserOnce(profile: OAuthProfile): Promise<User> {
    const email = normalizeEmail(profile.email);

    const existingAccount = await this.oauthAccountRepository.findOneBy({
      provider: profile.provider,
      providerUserId: profile.providerUserId,
    });
    if (existingAccount) {
      return this.usersService.findOne(existingAccount.userId);
    }

    let user = await this.usersService.findByEmail(email);
    if (!user) {
      user = await this.usersService.createFromOAuth({ ...profile, email });
    } else if (!user.emailVerified) {
      // Claimed before the link exists, not after: if a step fails between
      // the two, the account may end up claimed and unlinked (the next
      // login links normally) but never linked with the old access intact.
      await this.usersService.claimEmail(user.id);
      await this.refreshTokens.revokeAllForUser(user.id);
      await this.oauthAccountRepository.delete({ userId: user.id });
    }

    await this.oauthAccountRepository.save(
      this.oauthAccountRepository.create({
        provider: profile.provider,
        providerUserId: profile.providerUserId,
        userId: user.id,
      }),
    );
    return user;
  }
}
