// TypeORM entity for the API keys users create for `POST /oauth/token`.
import { ApiHideProperty } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';
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
 * An API key: the `client` and `secret` of the OAuth2 client-credentials
 * grant (`POST /oauth/token`, ADR-0015). Each belongs to the user who
 * created it, and the token it buys acts on that user's behalf. The secret
 * is shown once, at creation; the database keeps its SHA-256 hash.
 */
@Entity('api_client')
export class ApiClient {
  @PrimaryGeneratedColumn()
  id!: number;

  /** Owner. Deleting a user removes their keys with them. */
  @Index()
  @Column()
  userId!: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: User;

  /** A label of the owner's choice, to tell their keys apart. */
  @Column({ length: 50 })
  name!: string;

  /** The public half, sent as `client`. Random, not derived from the user. */
  @Column({ length: 32, unique: true })
  clientId!: string;

  /**
   * Hex SHA-256 of the secret (`hashSecret`). A fast hash is enough: the
   * secret is 256 random bits. Out of normal reads and of every response.
   */
  @Column({ type: 'char', length: 64, select: false })
  @Exclude()
  @ApiHideProperty()
  secretHash!: string;

  @CreateDateColumn()
  createdAt!: Date;
}
