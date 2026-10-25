// TypeORM entity for the users table.
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Exclude } from 'class-transformer';

/** UI language a user picked; defaults to English per the subject. */
export enum PreferredLanguage {
  EN = 'en',
  FR = 'fr',
}

/**
 * A Hypertube account - one row per registered user.
 *
 * `password` holds a hash and is excluded from default selects, so any
 * query that needs it must request it explicitly (see the field doc).
 */
@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ unique: true, length: 255 })
  email!: string;

  /**
   * Whether an OAuth provider vouched for `email`: `false` after a local
   * registration or an email change. See `AuthService.resolveOAuthUser`.
   */
  @Column({ default: false })
  emailVerified!: boolean;

  /**
   * Unique whatever the case (`Ada` and `ada` clash) through the index
   * `UQ_user_username_lower` on `LOWER(username)`, which lives in its
   * migration only: TypeORM cannot model it and its schema check ignores
   * expression indexes. The case is kept for display.
   */
  @Column({ unique: true, length: 30 })
  username!: string;

  @Column({ length: 100 })
  firstName!: string;

  @Column({ length: 100 })
  lastName!: string;

  /**
   * Password hash (argon2id, ADR-0001), never the plaintext - 255 chars
   * fit the encoded hash string. `select: false` keeps it out of normal
   * reads; fetch it deliberately (e.g. at login) with
   * `{ select: { password: true } }` or a query builder `addSelect`.
   * `@Exclude` is the second line of defence: even when the hash is
   * loaded on purpose, ClassSerializerInterceptor drops it before the
   * entity is serialised into an HTTP response.
   *
   * `null` for an OAuth-only account (42, GitHub, ...) - nothing was
   * ever hashed because the user never set a password. `AuthService.
   * validateUser` treats that case the same as an unknown username or
   * email, so
   * `POST /auth/login` can't be used to tell an OAuth-only account
   * apart from one that doesn't exist.
   *
   * Explicit `type` because the `string | null` union erases the
   * reflected column type (TypeORM would otherwise see "Object").
   */
  @Column({ type: 'varchar', select: false, length: 255, nullable: true })
  @Exclude()
  password!: string | null;

  /**
   * Avatar URL, https only, set through `PATCH /users/:id`; `null` until
   * the user sets one.
   */
  // Explicit `type` because the `string | null` union erases the
  // reflected column type (TypeORM would otherwise see "Object").
  @Column({ type: 'varchar', length: 500, nullable: true })
  profilePicture!: string | null;

  @Column({
    type: 'enum',
    enum: PreferredLanguage,
    default: PreferredLanguage.EN,
  })
  preferredLanguage!: PreferredLanguage;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
