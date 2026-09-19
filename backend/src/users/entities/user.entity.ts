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

  @Column({ unique: true, length: 30 })
  username!: string;

  @Column({ length: 100 })
  firstName!: string;

  @Column({ length: 100 })
  lastName!: string;

  /**
   * Password hash (argon2/bcrypt), never the plaintext - 255 chars fit
   * either algorithm's output. `select: false` keeps it out of normal
   * reads; fetch it deliberately (e.g. at login) with
   * `{ select: { password: true } }` or a query builder `addSelect`.
   * `@Exclude` is the second line of defence: even when the hash is
   * loaded on purpose, ClassSerializerInterceptor drops it before the
   * entity is serialised into an HTTP response.
   *
   * `null` for an OAuth-only account (42, GitHub, ...) - nothing was
   * ever hashed because the user never set a password. `AuthService.
   * validateUser` treats that case the same as an unknown email, so
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
   * Avatar URL. Nullable until the file-upload flow lands: registration
   * currently falls back to a default avatar in UsersService.create.
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
