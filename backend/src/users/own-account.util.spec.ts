// Unit spec for assertOwnAccount: 403 on another user's id, nothing on one's own.
import { ForbiddenException } from '@nestjs/common';
import { assertOwnAccount } from './own-account.util';

describe('assertOwnAccount', () => {
  it("passes on the caller's own id", () => {
    expect(() => assertOwnAccount({ id: 7 }, 7)).not.toThrow();
  });

  it("throws 403 on another user's id", () => {
    expect(() => assertOwnAccount({ id: 7 }, 8)).toThrow(ForbiddenException);
  });
});
