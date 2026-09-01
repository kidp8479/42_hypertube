import { Injectable, OnModuleInit } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import * as argon2 from 'argon2';
import { randomUUID } from 'node:crypto';
import { JwtService } from '@nestjs/jwt';
import { User } from '../users/entities/user.entity';

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
  ) {}

  async onModuleInit() {
    this.dummyHash = await argon2.hash(randomUUID());
  }

  /**
   * Resolves to the user when the credentials match, `null` otherwise.
   * A wrong password and an unknown email are deliberately
   * indistinguishable - same return value, same response time - so the
   * endpoint can't be used to discover which emails are registered.
   */
  async validateUser(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
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
   * Mints a signed access token for an already-authenticated user. The
   * caller is responsible for checking credentials first - this method
   * trusts its input. `sub` holds the user id per the JWT spec;
   * `username` rides along so routine requests skip a DB lookup, at the
   * cost of being stale until the token expires.
   */
  async login(user: User): Promise<{ access_token: string }> {
    const payload = { username: user.username, sub: user.id };
    const access_token = await this.jwtService.signAsync(payload);
    return { access_token };
  }
}
