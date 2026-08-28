import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

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
   */
  @Column({ select: false, length: 255 })
  password!: string;

  @Column({ length: 500 })
  profilePicture!: string;

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
