// Repository-backed CRUD for the users resource.
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './entities/user.entity';
import * as argon2 from 'argon2';
import { randomUUID } from 'node:crypto';
import { ARGON2_OPTIONS } from '../auth/argon2.config';

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

  findAll() {
    return this.usersRepository.find();
  }

  /**
   * Looks a user up by id. Throws {@link NotFoundException} (404) when
   * there is no such row - callers that need a "maybe absent" lookup
   * (e.g. the login flow) use `findByEmail`, which returns `null`.
   */
  async findOne(id: number) {
    const user = await this.usersRepository.findOneBy({ id });
    if (!user) {
      throw new NotFoundException(`User ${id} not found`);
    }
    return user;
  }

  /**
   * Looks a user up by email for the login flow. Uses a query builder
   * with `addSelect` so the `password` hash - hidden by `select: false`
   * on the entity - comes back alongside the normal columns; a plain
   * `findOneBy` would omit it. Resolves to `null` when there's no match.
   */
  findByEmail(email: string) {
    return this.usersRepository
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.email = :email', { email })
      .getOne();
  }

  // Caps the number of sequential "is it taken?" queries a single OAuth
  // signup can trigger - past this, a pre-seeded run of base/base1/base2/...
  // would otherwise make this loop run indefinitely.
  private static readonly MAX_USERNAME_ATTEMPTS = 50;

  /**
   * Finds a username close to `base` that isn't already taken - tries
   * `base` itself, then numeric suffixes (`base1`, `base2`, ...) on
   * collision. See `MAX_USERNAME_ATTEMPTS` for the fallback once that
   * search gets long.
   */
  private async findAvailableUsername(base: string): Promise<string> {
    let username = base;
    let counter = 1;
    while (await this.usersRepository.findOneBy({ username })) {
      if (counter > UsersService.MAX_USERNAME_ATTEMPTS) {
        username = `${base}${randomUUID().slice(0, 8)}`;
        break;
      }
      username = `${base}${counter++}`;
    }
    return username;
  }

  /**
   * Creates a `User` from a verified OAuth profile - no password, no
   * registration form. `username` is derived from the provider's suggested
   * value with a numeric-suffix fallback on collision (see
   * `findAvailableUsername`); email/OAuth-account uniqueness is the
   * caller's responsibility (see `AuthService.loginWithOAuth`).
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
      firstName: profile.firstName,
      lastName: profile.lastName,
      password: null,
      profilePicture: null,
    });
    return this.usersRepository.save(user);
  }

  /**
   * Applies a partial update by id and returns the saved row. Goes
   * through `preload` + `save` (not `repository.update`) so entity
   * lifecycle hooks run on the change. Throws {@link NotFoundException}
   * (404) when the id matches no row.
   */
  async update(id: number, updateUserDto: UpdateUserDto) {
    const user = await this.usersRepository.preload({ id, ...updateUserDto });
    if (!user) {
      throw new NotFoundException(`User ${id} not found`);
    }
    return this.usersRepository.save(user);
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
