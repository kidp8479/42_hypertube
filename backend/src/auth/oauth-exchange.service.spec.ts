import { OAuthExchangeService } from './oauth-exchange.service';

describe('OAuthExchangeService', () => {
  let service: OAuthExchangeService;

  beforeEach(() => {
    jest.useFakeTimers();
    service = new OAuthExchangeService();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('issue', () => {
    it('returns an unguessable URL-safe code', () => {
      const code = service.issue(7);

      // 32 random bytes, base64url without padding.
      expect(code).toMatch(/^[A-Za-z0-9_-]{43}$/);
      expect(service.issue(7)).not.toBe(code);
    });
  });

  describe('redeem', () => {
    it('returns the user id the code was issued for', () => {
      const code = service.issue(7);

      expect(service.redeem(code)).toBe(7);
    });

    it('works only once', () => {
      const code = service.issue(7);
      service.redeem(code);

      expect(service.redeem(code)).toBeUndefined();
    });

    it('rejects a code that was never issued', () => {
      expect(service.redeem('not-a-real-code')).toBeUndefined();
    });

    it('accepts a code just before the 60 s lifetime ends and rejects it after', () => {
      const early = service.issue(7);
      const late = service.issue(8);

      jest.advanceTimersByTime(59_999);
      expect(service.redeem(early)).toBe(7);

      jest.advanceTimersByTime(2);
      expect(service.redeem(late)).toBeUndefined();
    });
  });
});
