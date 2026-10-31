// API key lifecycle: create, list, revoke, and check a client + secret.
import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { Repository } from 'typeorm';
import { generateSecret, hashSecret } from '../common/utils/random-secret.util';
import { ApiClient } from './entities/api-client.entity';

/** Keys one user may hold at once: enough for a few scripts, no more. */
export const MAX_API_CLIENTS_PER_USER = 5;

/**
 * Owns the `api_client` table (ADR-0015). The secret exists in clear only in
 * the return value of {@link ApiClientsService.create}; everything else
 * works on its SHA-256.
 */
@Injectable()
export class ApiClientsService {
  constructor(
    @InjectRepository(ApiClient)
    private readonly clients: Repository<ApiClient>,
  ) {}

  /**
   * Creates a key for `userId` and returns it with its secret, once.
   *
   * @throws {ConflictException} 409 when the user already holds
   * {@link MAX_API_CLIENTS_PER_USER} keys.
   */
  async create(
    userId: number,
    name: string,
  ): Promise<{ client: ApiClient; secret: string }> {
    if ((await this.clients.countBy({ userId })) >= MAX_API_CLIENTS_PER_USER) {
      throw new ConflictException(
        `At most ${MAX_API_CLIENTS_PER_USER} API keys per user`,
      );
    }
    const secret = generateSecret();
    const client = await this.clients.save(
      this.clients.create({
        userId,
        name,
        clientId: `htc_${randomBytes(12).toString('hex')}`,
        secretHash: hashSecret(secret),
      }),
    );
    return { client, secret };
  }

  listFor(userId: number): Promise<ApiClient[]> {
    return this.clients.find({ where: { userId }, order: { id: 'ASC' } });
  }

  /**
   * Revokes one of the caller's keys. Tokens already bought with it stay
   * valid until they expire (stateless JWT, ADR-0002).
   *
   * @throws {NotFoundException} 404 for an unknown id.
   * @throws {ForbiddenException} 403 for another user's key.
   */
  async remove(id: number, userId: number): Promise<void> {
    const client = await this.clients.findOneBy({ id });
    if (!client) {
      throw new NotFoundException(`API client ${id} not found`);
    }
    if (client.userId !== userId) {
      throw new ForbiddenException();
    }
    await this.clients.delete(id);
  }

  /**
   * The key a `client` + `secret` pair names, or `undefined` when either is
   * wrong: the caller cannot tell an unknown client from a wrong secret.
   */
  async verify(
    clientId: string,
    secret: string,
  ): Promise<Pick<ApiClient, 'id' | 'userId'> | undefined> {
    const client = await this.clients.findOne({
      where: { clientId },
      select: { id: true, userId: true, secretHash: true },
    });
    const given = Buffer.from(hashSecret(secret));
    if (!client || !timingSafeEqual(given, Buffer.from(client.secretHash))) {
      return undefined;
    }
    return { id: client.id, userId: client.userId };
  }
}
