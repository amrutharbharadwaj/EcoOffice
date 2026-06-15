import { Request, Response, NextFunction } from 'express';

interface RateLimitRecord {
  count: number;
  firstAttempt: number;
}

const WINDOW_MS = 15 * 60 * 1000; // 15 minutes in milliseconds
const MAX_ATTEMPTS = 5;

// In-memory store: email -> { count, firstAttempt }
const loginAttempts = new Map<string, RateLimitRecord>();

/**
 * Checks whether the given email is currently rate-limited.
 * Returns { allowed: true } if login attempts are permitted,
 * or { allowed: false, retryAfter } with seconds remaining.
 */
export function checkRateLimit(email: string): { allowed: boolean; retryAfter?: number } {
  const normalizedEmail = email.toLowerCase().trim();
  const record = loginAttempts.get(normalizedEmail);

  if (!record) {
    return { allowed: true };
  }

  const elapsed = Date.now() - record.firstAttempt;

  // Window expired — reset
  if (elapsed > WINDOW_MS) {
    loginAttempts.delete(normalizedEmail);
    return { allowed: true };
  }

  // Max attempts exceeded within window
  if (record.count >= MAX_ATTEMPTS) {
    const retryAfter = Math.ceil((WINDOW_MS - elapsed) / 1000);
    return { allowed: false, retryAfter };
  }

  return { allowed: true };
}

/**
 * Records a failed login attempt for the given email.
 */
export function recordFailedAttempt(email: string): void {
  const normalizedEmail = email.toLowerCase().trim();
  const record = loginAttempts.get(normalizedEmail);

  if (!record) {
    loginAttempts.set(normalizedEmail, { count: 1, firstAttempt: Date.now() });
    return;
  }

  const elapsed = Date.now() - record.firstAttempt;

  // Window expired — start fresh
  if (elapsed > WINDOW_MS) {
    loginAttempts.set(normalizedEmail, { count: 1, firstAttempt: Date.now() });
    return;
  }

  record.count += 1;
}

/**
 * Resets the rate limit counter for the given email (called on successful login).
 */
export function resetRateLimit(email: string): void {
  const normalizedEmail = email.toLowerCase().trim();
  loginAttempts.delete(normalizedEmail);
}

/**
 * Rate limiter middleware for the login endpoint.
 * Rejects with 429 if the email has exceeded 5 failed attempts in 15 minutes.
 */
export function loginRateLimiter(req: Request, res: Response, next: NextFunction): void {
  const { email } = req.body;

  if (!email) {
    // If no email provided, let the validation layer handle it
    next();
    return;
  }

  const { allowed, retryAfter } = checkRateLimit(email);

  if (!allowed) {
    res.status(429).json({
      error: 'Too many attempts. Try again later.',
      retryAfter,
    });
    return;
  }

  next();
}

/**
 * Clears the in-memory store (useful for testing).
 */
export function clearRateLimitStore(): void {
  loginAttempts.clear();
}
