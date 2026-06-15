import fc from 'fast-check';
import bcrypt from 'bcrypt';
import request from 'supertest';
import express, { Request, Response, NextFunction } from 'express';
import session from 'express-session';
import * as authService from '../../services/authService';
import {
  checkRateLimit,
  recordFailedAttempt,
  clearRateLimitStore,
  loginRateLimiter,
} from '../../middleware/rateLimiter';
import { loginValidation } from '../../validators/authValidators';
import * as authController from '../../controllers/authController';

// Increase Jest timeout for property tests with bcrypt
jest.setTimeout(120000);

// Mock the database pool
jest.mock('../../db/pool', () => ({
  query: jest.fn(),
}));

// Mock bcrypt to use minimal rounds for speed in property tests
// while preserving correctness (hash still differs from plaintext, compare still works)
jest.mock('bcrypt', () => {
  const actualBcrypt = jest.requireActual('bcrypt');
  return {
    ...actualBcrypt,
    hash: (password: string, saltRounds: number) => actualBcrypt.hash(password, 4),
  };
});

import pool from '../../db/pool';
const mockPool = pool as jest.Mocked<typeof pool>;

/**
 * Creates a minimal test Express app with login route for HTTP-layer testing.
 */
function createLoginTestApp() {
  const app = express();

  app.use(express.json());

  // In-memory session (no PG dependency)
  app.use(
    session({
      secret: 'test-secret',
      resave: false,
      saveUninitialized: false,
      cookie: { secure: false },
    })
  );

  // Login route mirrors production: rateLimiter → validation → controller
  app.post('/api/v1/auth/login', loginRateLimiter, loginValidation, authController.login);

  // Centralized error handler
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.statusCode || 500;
    res.status(status).json({ error: err.message || 'Internal server error' });
  });

  return app;
}

// Arbitrary for valid email addresses
const validEmailArb = fc
  .tuple(
    fc.stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789'.split('')), {
      minLength: 1,
      maxLength: 20,
    }),
    fc.stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz'.split('')), {
      minLength: 2,
      maxLength: 10,
    }),
    fc.constantFrom('com', 'org', 'net', 'io', 'co.uk')
  )
  .map(([local, domain, tld]) => `${local}@${domain}.${tld}`);

// Arbitrary for valid passwords (8-128 chars, printable ASCII)
const validPasswordArb = fc.stringOf(
  fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOP!@#$%'.split('')),
  { minLength: 8, maxLength: 32 }
);

describe('Feature: eco-office, Property 5: Valid credentials produce a session', () => {
  /**
   * **Validates: Requirements 2.1**
   *
   * For any registered user with email E and password P, a login request
   * with (E, P) SHALL return a valid session token.
   */

  beforeEach(() => {
    jest.clearAllMocks();
    clearRateLimitStore();
  });

  it('valid credentials always produce a session (service layer)', async () => {
    await fc.assert(
      fc.asyncProperty(validEmailArb, validPasswordArb, async (email, password) => {
        // Create a bcrypt hash for the password (simulating what's stored in DB)
        const passwordHash = await bcrypt.hash(password, 4);

        const dbUser = {
          id: 1,
          email: email.toLowerCase(),
          name: 'Test User',
          password_hash: passwordHash,
          role: 'user',
          created_at: new Date(),
          updated_at: new Date(),
        };

        // Mock: DB returns the user row
        (mockPool.query as jest.Mock).mockResolvedValue({ rows: [dbUser] });

        const result = await authService.login(email, password);

        // Must return a user object (session data)
        expect(result).toBeDefined();
        expect(result.user).toBeDefined();
        expect(result.user.email).toBe(email.toLowerCase());
        expect((result.user as any).password_hash).toBeUndefined();
      }),
      { numRuns: 100 }
    );
  });

  it('valid credentials produce 200 with session cookie (HTTP layer)', async () => {
    const app = createLoginTestApp();

    await fc.assert(
      fc.asyncProperty(validEmailArb, validPasswordArb, async (email, password) => {
        clearRateLimitStore();

        const passwordHash = await bcrypt.hash(password, 4);

        const dbUser = {
          id: 1,
          email: email.toLowerCase(),
          name: 'Test User',
          password_hash: passwordHash,
          role: 'user',
          created_at: new Date(),
          updated_at: new Date(),
        };

        (mockPool.query as jest.Mock).mockResolvedValue({ rows: [dbUser] });

        const res = await request(app)
          .post('/api/v1/auth/login')
          .send({ email, password })
          .set('Content-Type', 'application/json');

        expect(res.status).toBe(200);
        expect(res.body.data).toBeDefined();
        expect(res.body.data.user).toBeDefined();

        // Should set a session cookie
        const setCookie = res.headers['set-cookie'];
        expect(setCookie).toBeDefined();
      }),
      { numRuns: 100 }
    );
  });
});

describe('Feature: eco-office, Property 6: Invalid credentials return generic error', () => {
  /**
   * **Validates: Requirements 2.2**
   *
   * For any login attempt with either a non-existent email or incorrect password,
   * the error response SHALL be identical in structure and message — never
   * revealing which field was wrong.
   */

  beforeEach(() => {
    jest.clearAllMocks();
    clearRateLimitStore();
  });

  it('non-existent email and wrong password produce identical error structure (service layer)', async () => {
    await fc.assert(
      fc.asyncProperty(
        validEmailArb,
        validPasswordArb,
        validPasswordArb.filter((p) => p.length >= 8),
        async (email, correctPassword, wrongPassword) => {
          // Ensure passwords differ
          fc.pre(wrongPassword !== correctPassword);

          // Case 1: Non-existent email — DB returns empty rows
          (mockPool.query as jest.Mock).mockResolvedValue({ rows: [] });

          let emailError: any;
          try {
            await authService.login(email, correctPassword);
          } catch (e) {
            emailError = e;
          }

          // Case 2: Wrong password — DB returns user but password doesn't match
          const passwordHash = await bcrypt.hash(correctPassword, 4);
          const dbUser = {
            id: 1,
            email: email.toLowerCase(),
            name: 'Test User',
            password_hash: passwordHash,
            role: 'user',
            created_at: new Date(),
            updated_at: new Date(),
          };
          (mockPool.query as jest.Mock).mockResolvedValue({ rows: [dbUser] });

          let passError: any;
          try {
            await authService.login(email, wrongPassword);
          } catch (e) {
            passError = e;
          }

          // Both errors must exist
          expect(emailError).toBeDefined();
          expect(passError).toBeDefined();

          // Both must have identical structure and message
          expect(emailError.message).toBe('Invalid email or password');
          expect(passError.message).toBe('Invalid email or password');
          expect(emailError.statusCode).toBe(401);
          expect(passError.statusCode).toBe(401);
          expect(emailError.message).toBe(passError.message);
          expect(emailError.statusCode).toBe(passError.statusCode);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('non-existent email and wrong password produce identical HTTP response (HTTP layer)', async () => {
    const app = createLoginTestApp();

    await fc.assert(
      fc.asyncProperty(
        validEmailArb,
        validPasswordArb,
        validPasswordArb.filter((p) => p.length >= 8),
        async (email, correctPassword, wrongPassword) => {
          fc.pre(wrongPassword !== correctPassword);
          clearRateLimitStore();

          // Case 1: Non-existent email
          (mockPool.query as jest.Mock).mockResolvedValue({ rows: [] });

          const res1 = await request(app)
            .post('/api/v1/auth/login')
            .send({ email, password: correctPassword })
            .set('Content-Type', 'application/json');

          clearRateLimitStore(); // Reset between cases

          // Case 2: Wrong password
          const passwordHash = await bcrypt.hash(correctPassword, 4);
          const dbUser = {
            id: 1,
            email: email.toLowerCase(),
            name: 'Test User',
            password_hash: passwordHash,
            role: 'user',
            created_at: new Date(),
            updated_at: new Date(),
          };
          (mockPool.query as jest.Mock).mockResolvedValue({ rows: [dbUser] });

          const res2 = await request(app)
            .post('/api/v1/auth/login')
            .send({ email, password: wrongPassword })
            .set('Content-Type', 'application/json');

          // Both should return 401 with identical error
          expect(res1.status).toBe(401);
          expect(res2.status).toBe(401);
          expect(res1.body).toEqual({ error: 'Invalid email or password' });
          expect(res2.body).toEqual({ error: 'Invalid email or password' });
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Feature: eco-office, Property 7: Rate limiting activates after threshold', () => {
  /**
   * **Validates: Requirements 2.5**
   *
   * For any email, after 5 consecutive failed login attempts within 15 minutes,
   * the next login attempt for that email SHALL be rejected with a rate-limit error,
   * regardless of whether credentials are correct.
   */

  beforeEach(() => {
    clearRateLimitStore();
    jest.clearAllMocks();
  });

  it('after 5 failed attempts, checkRateLimit blocks (direct rate limiter test)', () => {
    fc.assert(
      fc.property(validEmailArb, (email) => {
        clearRateLimitStore();

        // Record 5 failed attempts
        for (let i = 0; i < 5; i++) {
          recordFailedAttempt(email);
        }

        // 6th attempt should be blocked
        const result = checkRateLimit(email);
        expect(result.allowed).toBe(false);
        expect(result.retryAfter).toBeGreaterThan(0);
      }),
      { numRuns: 100 }
    );
  });

  it('fewer than 5 failed attempts still allows login', () => {
    fc.assert(
      fc.property(
        validEmailArb,
        fc.integer({ min: 1, max: 4 }),
        (email, attempts) => {
          clearRateLimitStore();

          for (let i = 0; i < attempts; i++) {
            recordFailedAttempt(email);
          }

          const result = checkRateLimit(email);
          expect(result.allowed).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('after 5 failed login requests via HTTP, the 6th returns 429', async () => {
    const app = createLoginTestApp();

    await fc.assert(
      fc.asyncProperty(validEmailArb, validPasswordArb, async (email, password) => {
        clearRateLimitStore();

        // Mock: user doesn't exist (all attempts fail)
        (mockPool.query as jest.Mock).mockResolvedValue({ rows: [] });

        // Send 5 failed login attempts
        for (let i = 0; i < 5; i++) {
          const res = await request(app)
            .post('/api/v1/auth/login')
            .send({ email, password })
            .set('Content-Type', 'application/json');

          expect(res.status).toBe(401);
        }

        // 6th attempt should be rate-limited (429), regardless of credentials
        const res6 = await request(app)
          .post('/api/v1/auth/login')
          .send({ email, password })
          .set('Content-Type', 'application/json');

        expect(res6.status).toBe(429);
        expect(res6.body.error).toBe('Too many attempts. Try again later.');
      }),
      { numRuns: 100 }
    );
  });

  it('rate limiting applies regardless of whether credentials are correct', async () => {
    const app = createLoginTestApp();

    await fc.assert(
      fc.asyncProperty(validEmailArb, validPasswordArb, async (email, password) => {
        clearRateLimitStore();

        // Mock: user doesn't exist (all attempts fail)
        (mockPool.query as jest.Mock).mockResolvedValue({ rows: [] });

        // Exhaust rate limit with 5 failed attempts
        for (let i = 0; i < 5; i++) {
          await request(app)
            .post('/api/v1/auth/login')
            .send({ email, password })
            .set('Content-Type', 'application/json');
        }

        // Now mock a valid user (correct credentials)
        const passwordHash = await bcrypt.hash(password, 4);
        const dbUser = {
          id: 1,
          email: email.toLowerCase(),
          name: 'Test User',
          password_hash: passwordHash,
          role: 'user',
          created_at: new Date(),
          updated_at: new Date(),
        };
        (mockPool.query as jest.Mock).mockResolvedValue({ rows: [dbUser] });

        // Even with correct credentials, should still get 429
        const res = await request(app)
          .post('/api/v1/auth/login')
          .send({ email, password })
          .set('Content-Type', 'application/json');

        expect(res.status).toBe(429);
        expect(res.body.error).toBe('Too many attempts. Try again later.');
      }),
      { numRuns: 100 }
    );
  });
});
