// Picks a free username for an account created from an OAuth profile.
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'node:crypto';
import { Raw, Repository } from 'typeorm';
import { User } from './entities/user.entity';

/**
 * Caps the number of sequential "is it taken?" queries a single OAuth signup
 * can trigger - past this, a pre-seeded run of base/base1/base2/... would
 * otherwise make the search run indefinitely.
 */
const MAX_ATTEMPTS = 50;

/**
 * Mirrors the `User` column length: an OAuth profile bypasses the DTO limits,
 * and a value past the column makes Postgres reject the insert.
 */
const USERNAME_MAX_LENGTH = 30;

/** Appends `suffix` to `base`, shortening `base` so the result still fits the column. */
function withSuffix(base: string, suffix: string): string {
  return base.slice(0, USERNAME_MAX_LENGTH - suffix.length) + suffix;
}

/**
 * Turns a provider's suggested login into a username no account holds yet.
 * Uniqueness is only checked here, not reserved: a concurrent signup can
 * still take the same name, and the unique index then makes the insert fail
 * (`AuthService.resolveOAuthUser` runs again on that).
 */
@Injectable()
export class UsernameAllocator {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  /**
   * `base` itself when free, then numeric suffixes (`base1`, `base2`, ...),
   * then a random suffix once `MAX_ATTEMPTS` lookups found nothing.
   */
  async available(base: string): Promise<string> {
    let username = base.slice(0, USERNAME_MAX_LENGTH);
    let counter = 1;
    while (await this.isTaken(username)) {
      if (counter > MAX_ATTEMPTS) {
        return withSuffix(base, randomUUID().slice(0, 8));
      }
      username = withSuffix(base, String(counter++));
    }
    return username;
  }

  /**
   * Whether a username is taken, whatever the case: the unique index is on
   * `LOWER(username)` (HYP-33), so the lookup compares the same way and `Ada`
   * counts as taken when `ada` exists.
   */
  private async isTaken(username: string): Promise<boolean> {
    const existing = await this.usersRepository.findOneBy({
      username: Raw((column) => `LOWER(${column}) = LOWER(:username)`, {
        username,
      }),
    });
    return Boolean(existing);
  }
}
