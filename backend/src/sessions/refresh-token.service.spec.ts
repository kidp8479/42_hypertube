// Unit spec for RefreshTokenService: issuing, rotating with reuse detection,
// the tolerance for two tabs refreshing at once, expiry, and logout.
import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { IsNull } from 'typeorm';
import { RefreshToken } from './entities/refresh-token.entity';
import { RefreshTokenService } from './refresh-token.service';
import { hashRefreshSecret } from './refresh-secret.util';

type RepoMock = {
  findOneBy: jest.Mock;
  create: jest.Mock;
  save: jest.Mock;
  update: jest.Mock;
  delete: jest.Mock;
};

const DAY = 86_400_000;
const NOW = new Date('2026-10-23T12:00:00.000Z');

// A stored row, valid and unused by default; a test overrides what it asserts on.
const buildRow = (overrides: Partial<RefreshToken> = {}): RefreshToken =>
  ({
    id: 1,
    userId: 7,
    familyId: 'family-1',
    tokenHash: hashRefreshSecret('the-secret'),
    expiresAt: new Date(NOW.getTime() + 7 * DAY),
    familyStartedAt: new Date(NOW.getTime() - DAY),
    rotatedAt: null,
    revokedAt: null,
    ...overrides,
  }) as RefreshToken;

const firstSaved = (repo: RepoMock): RefreshToken =>
  (repo.save.mock.calls as [RefreshToken][])[0][0];

describe('RefreshTokenService', () => {
  let service: RefreshTokenService;
  let repo: RepoMock;

  beforeEach(async () => {
    jest.useFakeTimers().setSystemTime(NOW);
    repo = {
      findOneBy: jest.fn(),
      create: jest.fn((row: Partial<RefreshToken>) => row),
      save: jest.fn((row: Partial<RefreshToken>) => Promise.resolve(row)),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      delete: jest.fn().mockResolvedValue({ affected: 0 }),
    };
    const moduleRef = await Test.createTestingModule({
      providers: [
        RefreshTokenService,
        { provide: getRepositoryToken(RefreshToken), useValue: repo },
        {
          provide: ConfigService,
          useValue: { getOrThrow: jest.fn().mockReturnValue('7d') },
        },
      ],
    }).compile();
    service = moduleRef.get(RefreshTokenService);
  });

  afterEach(() => jest.useRealTimers());

  describe('issue', () => {
    it('starts a family and stores the hash of the secret it returns, never the secret', async () => {
      const issued = await service.issue(7);

      const saved = firstSaved(repo);
      expect(saved.tokenHash).toBe(hashRefreshSecret(issued.secret));
      expect(JSON.stringify(saved)).not.toContain(issued.secret);
      expect(saved.userId).toBe(7);
      expect(saved.familyStartedAt).toEqual(NOW);
      expect(issued.expiresAt).toEqual(new Date(NOW.getTime() + 7 * DAY));
    });
  });

  describe('rotate', () => {
    it('consumes the token and issues the next one in the same family', async () => {
      repo.findOneBy.mockResolvedValue(buildRow());

      const next = await service.rotate('the-secret');

      expect(repo.update).toHaveBeenCalledWith(
        expect.objectContaining({ id: 1 }),
        { rotatedAt: NOW },
      );
      const saved = firstSaved(repo);
      expect(saved.familyId).toBe('family-1');
      expect(saved.familyStartedAt).toEqual(buildRow().familyStartedAt);
      expect(saved.tokenHash).toBe(hashRefreshSecret(next.secret));
      expect(next.userId).toBe(7);
      expect(next.secret).not.toBe('the-secret');
    });

    it('rejects an unknown secret', async () => {
      repo.findOneBy.mockResolvedValue(null);

      await expect(service.rotate('nope')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('rejects a revoked token', async () => {
      repo.findOneBy.mockResolvedValue(buildRow({ revokedAt: NOW }));

      await expect(service.rotate('the-secret')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('rejects an expired token', async () => {
      repo.findOneBy.mockResolvedValue(
        buildRow({ expiresAt: new Date(NOW.getTime() - 1) }),
      );

      await expect(service.rotate('the-secret')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('rejects a session older than the absolute cap, however recently it was refreshed', async () => {
      repo.findOneBy.mockResolvedValue(
        buildRow({ familyStartedAt: new Date(NOW.getTime() - 31 * DAY) }),
      );

      await expect(service.rotate('the-secret')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('never issues a token that outlives the absolute cap', async () => {
      repo.findOneBy.mockResolvedValue(
        buildRow({ familyStartedAt: new Date(NOW.getTime() - 28 * DAY) }),
      );

      const next = await service.rotate('the-secret');

      expect(next.expiresAt).toEqual(new Date(NOW.getTime() + 2 * DAY));
    });

    it('treats a token used again long after its rotation as theft and revokes the whole family', async () => {
      repo.findOneBy.mockResolvedValue(
        buildRow({ rotatedAt: new Date(NOW.getTime() - 60_000) }),
      );

      await expect(service.rotate('the-secret')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );

      expect(repo.update).toHaveBeenCalledWith(
        expect.objectContaining({ familyId: 'family-1' }),
        { revokedAt: NOW },
      );
      expect(repo.save).not.toHaveBeenCalled();
    });

    it('tolerates a token used again within seconds of its rotation (two tabs, a retry) without revoking', async () => {
      repo.findOneBy.mockResolvedValue(
        buildRow({ rotatedAt: new Date(NOW.getTime() - 2_000) }),
      );

      const next = await service.rotate('the-secret');

      expect(next.userId).toBe(7);
      expect(repo.update).not.toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ revokedAt: expect.anything() as Date }),
      );
    });

    it('tolerates losing the race to rotate: another request consumed it a moment ago', async () => {
      repo.findOneBy.mockResolvedValue(buildRow());
      repo.update.mockResolvedValueOnce({ affected: 0 });

      const next = await service.rotate('the-secret');

      expect(next.userId).toBe(7);
      expect(repo.save).toHaveBeenCalledTimes(1);
    });

    it('cleans up long-expired rows as it goes', async () => {
      repo.findOneBy.mockResolvedValue(buildRow());

      await service.rotate('the-secret');

      expect(repo.delete).toHaveBeenCalledTimes(1);
    });
  });

  describe('revokeFamilyOf', () => {
    it('revokes every token of the family the secret belongs to', async () => {
      repo.findOneBy.mockResolvedValue(buildRow());

      await service.revokeFamilyOf('the-secret');

      expect(repo.update).toHaveBeenCalledWith(
        expect.objectContaining({ familyId: 'family-1' }),
        { revokedAt: NOW },
      );
    });

    it('does nothing, and does not fail, for an unknown secret', async () => {
      repo.findOneBy.mockResolvedValue(null);

      await expect(service.revokeFamilyOf('nope')).resolves.toBeUndefined();
      expect(repo.update).not.toHaveBeenCalled();
    });
  });

  describe('revokeAllForUser', () => {
    it('revokes every live token of that user, whatever the family', async () => {
      await service.revokeAllForUser(7);

      expect(repo.update).toHaveBeenCalledWith(
        { userId: 7, revokedAt: IsNull() },
        { revokedAt: NOW },
      );
    });
  });

  describe('restartSessions', () => {
    it('revokes every live token of the user before storing the new one', async () => {
      const issued = await service.restartSessions(7);

      // An old session surviving a credential change is the failure this
      // guards against: the revoke must cover the user, and come first.
      expect(repo.update).toHaveBeenCalledWith(
        { userId: 7, revokedAt: IsNull() },
        { revokedAt: NOW },
      );
      expect(repo.update.mock.invocationCallOrder[0]).toBeLessThan(
        repo.save.mock.invocationCallOrder[0],
      );
      expect(firstSaved(repo).tokenHash).toBe(hashRefreshSecret(issued.secret));
      expect(firstSaved(repo).revokedAt ?? null).toBeNull();
    });
  });
});
