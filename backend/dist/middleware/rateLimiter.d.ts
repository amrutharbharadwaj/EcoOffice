import { Request, Response, NextFunction } from 'express';
/**
 * Checks whether the given email is currently rate-limited.
 * Returns { allowed: true } if login attempts are permitted,
 * or { allowed: false, retryAfter } with seconds remaining.
 */
export declare function checkRateLimit(email: string): {
    allowed: boolean;
    retryAfter?: number;
};
/**
 * Records a failed login attempt for the given email.
 */
export declare function recordFailedAttempt(email: string): void;
/**
 * Resets the rate limit counter for the given email (called on successful login).
 */
export declare function resetRateLimit(email: string): void;
/**
 * Rate limiter middleware for the login endpoint.
 * Rejects with 429 if the email has exceeded 5 failed attempts in 15 minutes.
 */
export declare function loginRateLimiter(req: Request, res: Response, next: NextFunction): void;
/**
 * Clears the in-memory store (useful for testing).
 */
export declare function clearRateLimitStore(): void;
//# sourceMappingURL=rateLimiter.d.ts.map