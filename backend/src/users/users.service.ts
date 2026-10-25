// Repository-backed CRUD for the users resource.
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Raw, Repository } from 'typeorm';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { normalizeEmail } from '../common/utils/normalize-email.util';
import { User } from './entities/user.entity';
import * as argon2 from 'argon2';
import { randomUUID } from 'node:crypto';
import { ARGON2_OPTIONS } from '../auth/argon2.config';

/** What a profile update did: the saved row, and whether the email or the password changed. */
interface ProfileUpdate {
  user: User;
  credentialsChanged: boolean;
}

/**
 * Data access for {@link User} rows. Wraps the TypeORM repository so the
 * rest of the app never issues SQL directly.
 */
@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  /**
   * Builds a User from the DTO, then inserts it. `create()` runs no SQL -
   * it's the in-memory step where password hashing and defaults belong -
   * and `save()` performs the INSERT.
   */
  async create(createUserDto: CreateUserDto) {
    const hashedPassword = await argon2.hash(
      createUserDto.password,
      ARGON2_OPTIONS,
    );
    const user = this.usersRepository.create({
      ...createUserDto,
      password: hashedPassword,
    });
    return this.usersRepository.save(user);
  }

  /** Every user, id and username only: the list never needs more (subject III.4). */
  findAll() {
    return this.usersRepository.find({ select: { id: true, username: true } });
  }

  /**
   * Looks a user up by id. Throws {@link NotFoundException} (404) when
   * there is no such row - callers that need a "maybe absent" lookup
   * (e.g. the login flow) use `findForLogin`, which returns `null`.
   */
  async findOne(id: number) {
    const user = await this.usersRepository.findOneBy({ id });
    if (!user) {
      throw new NotFoundException(`User ${id} not found`);
    }
    return user;
  }

  /**
   * Looks a user up by what was typed in the login field, password hash
   * included: an email when it contains `@` (a username cannot), otherwise
   * a username, matched whatever the case like its uniqueness. Resolves to
   * `null` when there is no match.
   */
  findForLogin(identifier: string) {
    if (identifier.includes('@')) {
      return this.findByEmail(normalizeEmail(identifier));
    }
    return this.findWithPassword('LOWER(user.username) = LOWER(:identifier)', {
      identifier,
    });
  }

  /** Looks a user up by email (login, OAuth linking), password hash included. */
  findByEmail(email: string) {
    return this.findWithPassword('user.email = :email', { email });
  }

  /**
   * One user matching a parameterised `where`, or `null`. A query builder
   * with `addSelect` so the `password` hash - hidden by `select: false` on
   * the entity - comes back alongside the normal columns; a plain
   * `findOneBy` would omit it.
   */
  private findWithPassword(
    where: string,
    params: Record<string, string | number>,
  ) {
    return this.usersRepository
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where(where, params)
      .getOne();
  }

  // Caps the number of sequential "is it taken?" queries a single OAuth
  // signup can trigger - past this, a pre-seeded run of base/base1/base2/...
  // would otherwise make this loop run indefinitely.
  private static readonly MAX_USERNAME_ATTEMPTS = 50;

  // Mirror the `User` column lengths: an OAuth profile bypasses the DTO
  // limits, and a value past the column makes Postgres reject the insert.
  private static readonly USERNAME_MAX_LENGTH = 30;
  private static readonly NAME_MAX_LENGTH = 100;

  /** Appends `suffix` to `base`, shortening `base` so the result still fits the column. */
  private static withSuffix(base: string, suffix: string): string {
    return (
      base.slice(0, UsersService.USERNAME_MAX_LENGTH - suffix.length) + suffix
    );
  }

  /**
   * Whether a username is taken, whatever the case: the unique index is on
   * `LOWER(username)` (HYP-33), so the lookup compares the same way and `Ada`
   * counts as taken when `ada` exists.
   */
  private async isUsernameTaken(username: string): Promise<boolean> {
    const existing = await this.usersRepository.findOneBy({
      username: Raw((column) => `LOWER(${column}) = LOWER(:username)`, {
        username,
      }),
    });
    return Boolean(existing);
  }

  /**
   * Finds a username close to `base` that isn't already taken - tries
   * `base` itself, then numeric suffixes (`base1`, `base2`, ...) on
   * collision. See `MAX_USERNAME_ATTEMPTS` for the fallback once that
   * search gets long.
   */
  private async findAvailableUsername(base: string): Promise<string> {
    let username = base.slice(0, UsersService.USERNAME_MAX_LENGTH);
    let counter = 1;
    while (await this.isUsernameTaken(username)) {
      if (counter > UsersService.MAX_USERNAME_ATTEMPTS) {
        username = UsersService.withSuffix(base, randomUUID().slice(0, 8));
        break;
      }
      username = UsersService.withSuffix(base, String(counter++));
    }
    return username;
  }

  /**
   * Creates a `User` from a verified OAuth profile - no password, no
   * registration form. `username` is derived from the provider's suggested
   * value with a numeric-suffix fallback on collision (see
   * `findAvailableUsername`); email/OAuth-account uniqueness is the
   * caller's responsibility (see `AuthService.resolveOAuthUser`).
   */
  async createFromOAuth(profile: {
    email: string;
    suggestedUsername: string;
    firstName: string;
    lastName: string;
  }): Promise<User> {
    const username = await this.findAvailableUsername(
      profile.suggestedUsername,
    );
    const user = this.usersRepository.create({
      email: profile.email,
      username,
      firstName: profile.firstName.slice(0, UsersService.NAME_MAX_LENGTH),
      lastName: profile.lastName.slice(0, UsersService.NAME_MAX_LENGTH),
      password: null,
      profilePicture: null,
      emailVerified: true,
    });
    return this.usersRepository.save(user);
  }

  /**
   * The user half of claiming an unverified account (`AuthService.
   * resolveOAuthUser`). A targeted `update` rather than `save`: `password`
   * is excluded from default selects, so a loaded entity would not carry it.
   */
  async claimEmail(id: number): Promise<void> {
    await this.usersRepository.update(id, {
      password: null,
      emailVerified: true,
    });
  }

  /**
   * Applies a partial update by id. A new password is hashed, a new email
   * is marked unverified, and either change first checks `currentPassword`
   * (see `confirmCredentialChange`). The email is compared normalised, so
   * sending the current one back is no change. A taken email or username
   * fails the save with a unique violation (409 through
   * `QueryFailedFilter`), before anything else happened.
   *
   * @throws {NotFoundException} 404 when the id matches no row.
   */
  async update(id: number, dto: UpdateUserDto): Promise<ProfileUpdate> {
    const { currentPassword, password, ...profile } = dto;
    const user = await this.findWithPassword('user.id = :id', { id });
    if (!user) {
      throw new NotFoundException(`User ${id} not found`);
    }
    const emailChanged =
      profile.email !== undefined && profile.email !== user.email;
    const credentialsChanged = emailChanged || password !== undefined;
    if (credentialsChanged) {
      await this.confirmCredentialChange(user.password, currentPassword);
    }

    Object.assign(user, profile);
    if (password !== undefined) {
      user.password = await argon2.hash(password, ARGON2_OPTIONS);
    }
    if (emailChanged) {
      user.emailVerified = false;
    }
    return { user: await this.usersRepository.save(user), credentialsChanged };
  }

  /**
   * Re-authentication for an email or password change. An account without
   * a password (OAuth-only, or just claimed) sets one through the reset
   * flow instead: an access token still alive after a claim must not.
   *
   * @throws {BadRequestException} 400 when the account has no password, or
   * when `currentPassword` is missing.
   * @throws {ForbiddenException} 403 when it is wrong: the request is
   * refused, the session stays valid (a 401 would make the SPA refresh).
   */
  private async confirmCredentialChange(
    hash: string | null,
    currentPassword: string | undefined,
  ): Promise<void> {
    if (hash === null) {
      throw new BadRequestException(
        'this account has no password: set one through the password reset first',
      );
    }
    if (currentPassword === undefined) {
      throw new BadRequestException(
        'currentPassword is required to change the email or the password',
      );
    }
    if (!(await argon2.verify(hash, currentPassword))) {
      throw new ForbiddenException();
    }
  }

  /**
   * Deletes a user by id. Throws {@link NotFoundException} (404) when the
   * id matches no row, so a DELETE never silently succeeds on nothing.
   */
  async remove(id: number) {
    const result = await this.usersRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`User ${id} not found`);
    }
  }
}
