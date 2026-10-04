// Credential checking and token issuance, used by AuthController.
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
import { ARGON2_OPTIONS } from './argon2.config';
import { InjectRepository } from '@nestjs/typeorm';
import { OAuthAccount } from './entities/oauth-account.entity';
import { QueryFailedError, Repository } from 'typeorm';
import { OAuthProfile } from './strategies/oauth-profile.interface';
import { normalizeEmail } from '../common/utils/normalize-email.util';
import { UNIQUE_VIOLATION } from '../common/filters/query-failed.filter';

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
   * redeemed (ADR-0007). Three cases, checked in order:
   * 1. This (provider, providerUserId) pair is already linked - that user,
   *    nothing else to do.
   * 2. Not linked yet, but the provider vouches the email is verified -
   *    link to an existing local account with that email if one exists
   *    (revoking that account's password, see below), otherwise create a
   *    fresh one.
   * 3. Not linked and the email isn't verified - create a fresh account
   *    without matching by email (matching an unverified email to an
   *    existing account would let an attacker claim it as their own).
   *
   * Revoking the password on link: local registration does not verify the
   * email, so an attacker could pre-register a victim's address with a
   * password of their own. When the real owner later signs in through a
   * provider and is linked to that account, the attacker's password must
   * stop working - the owner sets a new one through the reset flow.
   *
   * `profile.email` is normalized here rather than trusted as-is: unlike
   * `LoginDto`/`CreateUserDto`, it never passes through the validation
   * pipe's `@NormalizeEmail`, so a provider returning a different casing
   * than the one a local account was registered with would otherwise
   * dodge the case-insensitive match in case 2 and create a duplicate
   * account instead of linking to the existing one.
   */
  async resolveOAuthUser(profile: OAuthProfile): Promise<User> {
    const email = normalizeEmail(profile.email);

    const existingAccount = await this.oauthAccountRepository.findOneBy({
      provider: profile.provider,
      providerUserId: profile.providerUserId,
    });
    if (existingAccount) {
      return this.usersService.findOne(existingAccount.userId);
    }

    let user: User | null = null;
    if (profile.emailVerified) {
      user = await this.usersService.findByEmail(email);
    }
    // Set only when linking to an account registered locally with a
    // password: registration never verifies the email, so that password
    // may belong to someone who does not own the address.
    const passwordToRevoke = user?.password ? user.id : null;
    if (!user) {
      user = await this.usersService.createFromOAuth({ ...profile, email });
    }

    // Revoked before the link exists, not after: if a step fails between
    // the two, the account may end up password-less and unlinked (the
    // owner resets it, the next login links normally) but never linked
    // with the old password still working.
    if (passwordToRevoke !== null) {
      await this.usersService.clearPassword(passwordToRevoke);
    }

    try {
      await this.oauthAccountRepository.save(
        this.oauthAccountRepository.create({
          provider: profile.provider,
          providerUserId: profile.providerUserId,
          userId: user.id,
        }),
      );
    } catch (err) {
      user = await this.recoverFromLinkRace(profile, err);
    }

    return user;
  }

  /**
   * Handles a lost race on the `oauth_account` insert: a second,
   * concurrent callback for this same provider account (e.g. a
   * double-click) won and already holds the link this one tried to
   * create. From the user's side both requests are one successful login,
   * so return the winner's user and sign in through it instead of
   * surfacing the unique-violation 409 the global filter would otherwise
   * produce. Anything else is rethrown untouched.
   */
  private async recoverFromLinkRace(
    profile: OAuthProfile,
    err: unknown,
  ): Promise<User> {
    const code = (err as QueryFailedError & { code?: string }).code;
    if (!(err instanceof QueryFailedError) || code !== UNIQUE_VIOLATION) {
      throw err;
    }
    const account = await this.oauthAccountRepository.findOneBy({
      provider: profile.provider,
      providerUserId: profile.providerUserId,
    });
    if (!account) {
      throw err;
    }
    return this.usersService.findOne(account.userId);
  }
}
