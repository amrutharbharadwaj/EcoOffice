import { Request, Response, NextFunction } from 'express';
import {
  checkRateLimit,
  recordFailedAttempt,
  resetRateLimit,
  loginRateLimiter,
  clearRateLimitStore,
} from './rateLimiter';

function createMockReq(body: any): Partial<Request> {
  return { body };
}

function createMockRes(): Partial<Response> {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('rateLimiter', () => {
  beforeEach(() => {
    clearRateLimitStore();
  });

  describe('checkRateLimit', () => {
    it('should allow first attempt for new email', () => {
      const result = checkRateLimit('user@example.com');
      expect(result.allowed).toBe(true);
    });

    it('should allow attempts below threshold', () => {
      for (let i = 0; i < 4; i++) {
        recordFailedAttempt('user@example.com');
      }
      const result = checkRateLimit('user@example.com');
      expect(result.allowed).toBe(true);
    });

    it('should block after 5 failed attempts within window', () => {
      for (let i = 0; i < 5; i++) {
        recordFailedAttempt('user@example.com');
      }
      const result = checkRateLimit('user@example.com');
      expect(result.allowed).toBe(false);
      expect(result.retryAfter).toBeGreaterThan(0);
    });

    it('should be case-insensitive for email', () => {
      for (let i = 0; i < 5; i++) {
        recordFailedAttempt('User@Example.COM');
      }
      const result = checkRateLimit('user@example.com');
      expect(result.allowed).toBe(false);
    });

    it('should reset after window expires', () => {
      jest.useFakeTimers();

      for (let i = 0; i < 5; i++) {
        recordFailedAttempt('user@example.com');
      }

      // Advance time past the 15-minute window
      jest.advanceTimersByTime(15 * 60 * 1000 + 1);

      const result = checkRateLimit('user@example.com');
      expect(result.allowed).toBe(true);

      jest.useRealTimers();
    });
  });

  describe('resetRateLimit', () => {
    it('should clear attempts for the email on successful login', () => {
      for (let i = 0; i < 5; i++) {
        recordFailedAttempt('user@example.com');
      }

      resetRateLimit('user@example.com');

      const result = checkRateLimit('user@example.com');
      expect(result.allowed).toBe(true);
    });
  });

  describe('loginRateLimiter middleware', () => {
    it('should call next() when under the limit', () => {
      const req = createMockReq({ email: 'test@example.com' }) as Request;
      const res = createMockRes() as Response;
      const next: NextFunction = jest.fn();

      loginRateLimiter(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should return 429 when rate limit exceeded', () => {
      for (let i = 0; i < 5; i++) {
        recordFailedAttempt('test@example.com');
      }

      const req = createMockReq({ email: 'test@example.com' }) as Request;
      const res = createMockRes() as Response;
      const next: NextFunction = jest.fn();

      loginRateLimiter(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(429);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Too many attempts. Try again later.',
        })
      );
    });

    it('should call next() when no email in body', () => {
      const req = createMockReq({}) as Request;
      const res = createMockRes() as Response;
      const next: NextFunction = jest.fn();

      loginRateLimiter(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });
});
