// TypeORM entity for the refresh tokens that keep a session alive (HYP-77).
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

/**
 * One row per refresh token ever issued. The token itself is a random secret
 * that only the browser's cookie holds; the database keeps its SHA-256 hash,
 * so a leaked table cannot be replayed.
 *
 * Tokens are rotated: using one consumes it (`rotatedAt`) and issues the next
 * in the same `familyId`. A family is one login. Seeing an already-consumed
 * token again means two parties hold copies, so the whole family is revoked
 * (`revokedAt`), which is how a stolen token is detected and cut off.
 */
@Entity('refresh_token')
export class RefreshToken {
  @PrimaryGeneratedColumn()
  id!: number;

  /** Owner. Deleting a user removes their sessions with them. */
  @Index()
  @Column()
  userId!: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: User;

  /** Groups the tokens of one login, so one reuse can revoke all of them. */
  @Index()
  @Column({ type: 'uuid' })
  familyId!: string;

  /**
   * Hex SHA-256 of the secret. A fast hash is enough here: the secret is 256
   * random bits, so unlike a password it cannot be guessed offline.
   */
  @Column({ type: 'char', length: 64, unique: true })
  tokenHash!: string;

  /** Sliding expiry: each rotation issues a token valid for a fresh window. */
  @Column({ type: 'timestamptz' })
  expiresAt!: Date;

  /**
   * When the family was first created, copied on every rotation. Caps the
   * total session length however often it is refreshed.
   */
  @Column({ type: 'timestamptz' })
  familyStartedAt!: Date;

  /** Set when the token is exchanged for the next one. */
  @Column({ type: 'timestamptz', nullable: true })
  rotatedAt!: Date | null;

  /** Set on logout and on detected reuse; a revoked token is never accepted. */
  @Column({ type: 'timestamptz', nullable: true })
  revokedAt!: Date | null;

  @CreateDateColumn()
  createdAt!: Date;
}
