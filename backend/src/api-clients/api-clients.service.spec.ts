// Unit spec for ApiClientsService: the secret is returned once and stored
// hashed, a key belongs to its owner, and a wrong client or secret is refused.
import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import type { Repository } from 'typeorm';
import { hashSecret } from '../common/utils/random-secret.util';
import {
  ApiClientsService,
  MAX_API_CLIENTS_PER_USER,
} from './api-clients.service';
import { ApiClient } from './entities/api-client.entity';

const row = (overrides: Partial<ApiClient> = {}): ApiClient =>
  Object.assign(new ApiClient(), {
    id: 3,
    userId: 7,
    name: 'script',
    clientId: 'htc_0123456789abcdef01234567',
    secretHash: hashSecret('the-secret'),
    createdAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  });

describe('ApiClientsService', () => {
  const repo = {
    countBy: jest.fn(),
    create: jest.fn((fields: Partial<ApiClient>) => row(fields)),
    save: jest.fn((client: ApiClient) => Promise.resolve(client)),
    find: jest.fn(),
    findOneBy: jest.fn(),
    findOne: jest.fn(),
    delete: jest.fn(),
  };
  const service = new ApiClientsService(
    repo as unknown as Repository<ApiClient>,
  );

  describe('create', () => {
    it('returns the secret once and stores only its hash', async () => {
      repo.countBy.mockResolvedValue(0);

      const { client, secret } = await service.create(7, 'script');

      expect(client.secretHash).toBe(hashSecret(secret));
      expect(client.secretHash).not.toContain(secret);
      expect(client.clientId).toMatch(/^htc_[0-9a-f]{24}$/);
      expect(client.userId).toBe(7);
    });

    it('refuses a key past the per-user cap with 409', async () => {
      repo.countBy.mockResolvedValue(MAX_API_CLIENTS_PER_USER);

      await expect(service.create(7, 'one more')).rejects.toThrow(
        ConflictException,
      );
      expect(repo.save).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it("deletes the caller's own key", async () => {
      repo.findOneBy.mockResolvedValue(row());

      await service.remove(3, 7);

      expect(repo.delete).toHaveBeenCalledWith(3);
    });

    it("answers 403 on another user's key, and deletes nothing", async () => {
      repo.findOneBy.mockResolvedValue(row({ userId: 8 }));

      await expect(service.remove(3, 7)).rejects.toThrow(ForbiddenException);
      expect(repo.delete).not.toHaveBeenCalled();
    });

    it('answers 404 on an unknown id', async () => {
      repo.findOneBy.mockResolvedValue(null);

      await expect(service.remove(99, 7)).rejects.toThrow(NotFoundException);
    });
  });

  describe('verify', () => {
    it('returns the key and its owner for the right secret', async () => {
      repo.findOne.mockResolvedValue(row());

      await expect(
        service.verify(row().clientId, 'the-secret'),
      ).resolves.toEqual({ id: 3, userId: 7 });
    });

    it('refuses a wrong secret and an unknown client alike', async () => {
      repo.findOne.mockResolvedValueOnce(row());
      await expect(service.verify(row().clientId, 'wrong')).resolves.toBe(
        undefined,
      );

      repo.findOne.mockResolvedValueOnce(null);
      await expect(service.verify('htc_unknown', 'the-secret')).resolves.toBe(
        undefined,
      );
    });
  });
});
