// Unit spec for UsernameAllocator with a mocked repository: the suggested
// name when free, numeric then random suffixes on collision, the
// case-insensitive lookup and the column length.
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { FindOperator } from 'typeorm';
import { User } from './entities/user.entity';
import { UsernameAllocator } from './username-allocator.service';

// The username each `findOneBy` call looked for, in order. The lookup is a
// raw operator (a case-insensitive comparison), so the name sits in its
// parameters rather than in the `where` object itself.
function lookedUpUsernames(findOneBy: jest.Mock): unknown[] {
  const calls = findOneBy.mock.calls as [{ username: FindOperator<string> }][];
  return calls.map(
    ([where]) => where.username.objectLiteralParameters?.username as unknown,
  );
}

describe('UsernameAllocator', () => {
  let allocator: UsernameAllocator;
  let findOneBy: jest.Mock;

  beforeEach(async () => {
    findOneBy = jest.fn();
    const moduleRef = await Test.createTestingModule({
      providers: [
        UsernameAllocator,
        { provide: getRepositoryToken(User), useValue: { findOneBy } },
      ],
    }).compile();
    allocator = moduleRef.get(UsernameAllocator);
  });

  it('keeps the suggested username when it is free', async () => {
    findOneBy.mockResolvedValue(null);

    await expect(allocator.available('ada')).resolves.toBe('ada');
    expect(lookedUpUsernames(findOneBy)).toEqual(['ada']);
  });

  it('falls back to a numeric suffix when the suggested username is taken', async () => {
    findOneBy.mockResolvedValueOnce({ id: 1 }).mockResolvedValueOnce(null);

    await expect(allocator.available('ada')).resolves.toBe('ada1');
    expect(lookedUpUsernames(findOneBy)).toEqual(['ada', 'ada1']);
  });

  it('treats a username differing only by case as taken', async () => {
    findOneBy.mockResolvedValue(null);

    await allocator.available('ada');

    // The unique index is on LOWER(username): the lookup must compare the
    // same way, or it calls `Ada` free for `ada` and the insert then fails.
    const [[where]] = findOneBy.mock.calls as [
      [{ username: FindOperator<string> }],
    ];
    expect(where.username.getSql?.('"user"."username"')).toBe(
      'LOWER("user"."username") = LOWER(:username)',
    );
  });

  it('falls back to a random suffix once the numeric attempts are exhausted', async () => {
    // Every candidate - 'ada', 'ada1', 'ada2', ... - looks taken.
    findOneBy.mockResolvedValue({ id: 1 });

    const username = await allocator.available('ada');

    expect(findOneBy.mock.calls.length).toBeGreaterThan(50);
    expect(username).toMatch(/^ada[0-9a-f]{8}$/);
  });

  describe('column length', () => {
    // A GitHub login can reach 39 characters; the username column is 30.
    const longLogin = 'a'.repeat(39);

    it('truncates a suggested username to the column length', async () => {
      findOneBy.mockResolvedValue(null);

      await expect(allocator.available(longLogin)).resolves.toBe(
        'a'.repeat(30),
      );
    });

    it('keeps a numeric suffix within the column length on collision', async () => {
      findOneBy.mockResolvedValueOnce({ id: 1 }).mockResolvedValueOnce(null);

      await expect(allocator.available(longLogin)).resolves.toBe(
        `${'a'.repeat(29)}1`,
      );
    });

    it('keeps the random fallback suffix within the column length', async () => {
      findOneBy.mockResolvedValue({ id: 1 });

      await expect(allocator.available(longLogin)).resolves.toMatch(
        /^a{22}[0-9a-f]{8}$/,
      );
    });
  });
});
