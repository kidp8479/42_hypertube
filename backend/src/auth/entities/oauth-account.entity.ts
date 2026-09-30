// TypeORM entity linking a User to one OAuth provider identity.
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Unique,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum OAuthProvider {
  FORTYTWO = 'fortytwo',
  GITHUB = 'github',
}

/**
 * One row per (provider, external account) a User has signed in with.
 * A User can hold several - one per provider - so this is a separate
 * table rather than columns on `User`.
 */
@Entity('oauth_account')
@Unique(['provider', 'providerUserId'])
export class OAuthAccount {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'enum', enum: OAuthProvider })
  provider!: OAuthProvider;

  /**
   * The account id the provider itself uses, e.g. a 42 or GitHub numeric
   * user id. Unique together with `provider` (see the class decorator)
   * so a given provider account can never be claimed by two local
   * Users - the only thing standing between this and an account
   * takeover.
   */
  @Column({ length: 255 })
  providerUserId!: string;

  /**
   * Explicit FK column alongside the `user` relation below, so callers
   * can filter by owner (`findOneBy({ userId, provider })`) without
   * loading or joining the full User row.
   */
  @Column()
  userId!: number;

  // Deleting a User must take their linked OAuth identities with it -
  // an orphaned row here would keep a provider account "claimed" by a
  // user id that no longer exists.
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: User;

  @CreateDateColumn()
  createdAt!: Date;
}
