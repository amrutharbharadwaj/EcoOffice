import fc from 'fast-check';
import bcrypt from 'bcrypt';
import request from 'supertest';
import express, { Request, Response, NextFunction } from 'express';
import session from 'express-session';
import pool from '../../db/pool';
import authRouter from '../../routes/auth';
import { attachErrorHandler } from '../../app';

// Mock the database pool
jest.mock('../../db/pool', () => ({
  query: jest.fn(),
}));

// Mock bcrypt to use low salt rounds in tests (speeds up hashing dramatically)
jest.mock('bcrypt', () => {
  const actualBcrypt = jest.requireActual('bcrypt');
  return {
    ...actualBcrypt,
    hash: (password: string, _saltOrRounds: any) => actualBcrypt.hash(password, 4),
    compare: actualBcrypt.compare,
  };
});

const mockPool = pool as jest.Mocked<typeof pool>;

/**
 * Creates a minimal test Express app that mirrors the production middleware
 * stack (content-type enforcement, JSON parsing, session, auth routes)
 * without requiring a real PostgreSQL connection.
 */
function createTestApp() {
  const app = express();

  // Content-type enforcement (mirrors app.ts)
  app.use((req: Request, res: Response, next: NextFunction) => {
    const hasBody =
      req.headers['content-length'] &&
      parseInt(req.headers['content-length'], 10) > 0;
    const isTransferEncoded = !!req.headers['transfer-encoding'];

    if ((hasBody || isTransferEncoded) && !req.is('application/json')) {
      res.status(400).json({ error: 'Content-Type must be application/json' });
      return;
    }
    next();
  });

  app.use(express.json());

  // In-memory session store for tests (no PG dependency)
  app.use(
    session({
      secret: 'test-secret',
      resave: false,
      saveUninitialized: false,
      cookie: { secure: false },
    })
  );

  // Mount auth routes at /api/v1/auth
  app.use('/api/v1/auth', authRouter);

  // Attach centralized error handler
  attachErrorHandler(app);

  return app;
}

// ─── Arbitraries ────────────────────────────────────────────────────────────

/**
 * Generates a valid email address (proper format, ≤ 254 characters).
 */
const validEmailArb = fc
  .tuple(
    // local part: 1-60 alphanumeric chars
    fc.stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789'.split('')), {
      minLength: 1,
      maxLength: 60,
    }),
    // domain: 1-50 alphanumeric chars
    fc.stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789'.split('')), {
      minLength: 1,
      maxLength: 50,
    }),
    // tld: 2-6 alpha chars
    fc.stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz'.split('')), {
      minLength: 2,
      maxLength: 6,
    })
  )
  .map(([local, domain, tld]) => `${local}@${domain}.${tld}`)
  .filter((email) => email.length <= 254);

/**
 * Generates a valid name (non-whitespace, 1–100 chars).
 */
const validNameArb = fc
  .stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ '.split('')), {
    minLength: 1,
    maxLength: 100,
  })
  .filter((name) => name.trim().length >= 1);

/**
 * Generates a valid password (8–128 chars).
 */
const validPasswordArb = fc.string({ minLength: 8, maxLength: 128 }).filter((p) => p.length >= 8);

/**
 * Generates an invalid email (bad format or > 254 chars).
 */
const invalidEmailArb = fc.oneof(
  // Missing @ sign
  fc.stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789'.split('')), {
    minLength: 1,
    maxLength: 50,
  }),
  // Too long email
  fc
    .tuple(
      fc.stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz'.split('')), {
        minLength: 200,
        maxLength: 240,
      }),
      fc.stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz'.split('')), {
        minLength: 5,
        maxLength: 10,
      })
    )
    .map(([local, domain]) => `${local}@${domain}.com`),
  // Empty string
  fc.constant(''),
  // Only spaces
  fc.constant('   '),
  // Missing domain
  fc.constant('user@'),
  // Missing local
  fc.constant('@domain.com')
);

/**
 * Generates an invalid password (< 8 or > 128 chars).
 */
const invalidPasswordArb = fc.oneof(
  // Too short (1-7 chars)
  fc.string({ minLength: 1, maxLength: 7 }),
  // Too long (129+ chars)
  fc.string({ minLength: 129, maxLength: 200 })
);

/**
 * Generates an invalid name (empty, whitespace-only, or > 100 chars).
 */
const invalidNameArb = fc.oneof(
  // Empty
  fc.constant(''),
  // Whitespace-only
  fc.stringOf(fc.constantFrom(' ', '\t', '\n'), { minLength: 1, maxLength: 10 }),
  // Too long (> 100 chars)
  fc.stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz'.split('')), {
    minLength: 101,
    maxLength: 150,
  })
);

// ─── Property Tests ─────────────────────────────────────────────────────────

describe('Auth Registration Property Tests', () => {
  const app = createTestApp();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Property 1: Valid registration produces a user account
   *
   * For any valid email (proper format, ≤254 chars), name (non-whitespace, 1–100 chars),
   * and password (8–128 chars), the registration service SHALL create a user and return
   * success with user data.
   *
   * **Validates: Requirements 1.1**
   */
  describe('Property 1: Valid registration produces a user account', () => {
    it('should return 201 with user data for any valid registration inputs', async () => {
      await fc.assert(
        fc.asyncProperty(validEmailArb, validNameArb, validPasswordArb, async (email, name, password) => {
          // Mock the DB to return the inserted user row
          const mockUser = {
            id: 1,
            email: email.toLowerCase().trim(),
            name: name.trim(),
            role: 'user',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          (mockPool.query as jest.Mock).mockResolvedValue({ rows: [mockUser] });

          const res = await request(app)
            .post('/api/v1/auth/register')
            .set('Content-Type', 'application/json')
            .send({ email, name, password });

          expect(res.status).toBe(201);
          expect(res.body.data).toBeDefined();
          expect(res.body.data.user).toBeDefined();
          expect(res.body.data.user.email).toBeDefined();
          expect(res.body.data.user.role).toBe('user');
        }),
        { numRuns: 100 }
      );
    }, 60000);
  });

  /**
   * Property 2: Invalid registration inputs are rejected
   *
   * For any registration input where the email is invalid format or > 254 chars,
   * OR the password is < 8 or > 128 chars, OR the name is empty/whitespace-only/> 100 chars,
   * the registration service SHALL reject the request with a validation error
   * identifying the failing field.
   *
   * **Validates: Requirements 1.3, 1.5, 1.6**
   */
  describe('Property 2: Invalid registration inputs are rejected', () => {
    it('should return 400 for any invalid email', async () => {
      await fc.assert(
        fc.asyncProperty(invalidEmailArb, validNameArb, validPasswordArb, async (email, name, password) => {
          const res = await request(app)
            .post('/api/v1/auth/register')
            .set('Content-Type', 'application/json')
            .send({ email, name, password });

          expect(res.status).toBe(400);
          expect(res.body.error).toBeDefined();
          expect(res.body.fields).toBeDefined();
          // Should identify the email field
          const emailField = res.body.fields.find((f: any) => f.field === 'email');
          expect(emailField).toBeDefined();
        }),
        { numRuns: 100 }
      );
    });

    it('should return 400 for any invalid password', async () => {
      await fc.assert(
        fc.asyncProperty(validEmailArb, validNameArb, invalidPasswordArb, async (email, name, password) => {
          const res = await request(app)
            .post('/api/v1/auth/register')
            .set('Content-Type', 'application/json')
            .send({ email, name, password });

          expect(res.status).toBe(400);
          expect(res.body.error).toBeDefined();
          expect(res.body.fields).toBeDefined();
          // Should identify the password field
          const passwordField = res.body.fields.find((f: any) => f.field === 'password');
          expect(passwordField).toBeDefined();
        }),
        { numRuns: 100 }
      );
    });

    it('should return 400 for any invalid name', async () => {
      await fc.assert(
        fc.asyncProperty(validEmailArb, invalidNameArb, validPasswordArb, async (email, name, password) => {
          const res = await request(app)
            .post('/api/v1/auth/register')
            .set('Content-Type', 'application/json')
            .send({ email, name, password });

          expect(res.status).toBe(400);
          expect(res.body.error).toBeDefined();
          expect(res.body.fields).toBeDefined();
          // Should identify the name field
          const nameField = res.body.fields.find((f: any) => f.field === 'name');
          expect(nameField).toBeDefined();
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 3: Duplicate email registration is rejected
   *
   * For any email that is already registered, a subsequent registration attempt
   * with that email SHALL be rejected with a conflict error.
   *
   * **Validates: Requirements 1.2**
   */
  describe('Property 3: Duplicate email registration is rejected', () => {
    it('should return 409 when the email is already registered', async () => {
      await fc.assert(
        fc.asyncProperty(validEmailArb, validNameArb, validPasswordArb, async (email, name, password) => {
          // Mock the DB to throw PostgreSQL unique_violation error (code 23505)
          const pgError: any = new Error('duplicate key value violates unique constraint "users_email_key"');
          pgError.code = '23505';
          (mockPool.query as jest.Mock).mockRejectedValue(pgError);

          const res = await request(app)
            .post('/api/v1/auth/register')
            .set('Content-Type', 'application/json')
            .send({ email, name, password });

          expect(res.status).toBe(409);
          expect(res.body.error).toBeDefined();
          expect(res.body.error).toContain('already registered');
        }),
        { numRuns: 100 }
      );
    }, 60000);
  });

  /**
   * Property 4: Password hashing produces irreversible unique hashes
   *
   * For any password string, the stored hash SHALL differ from the plaintext,
   * and hashing the same password twice SHALL produce different hash values
   * (due to unique salt per user).
   *
   * **Validates: Requirements 1.4**
   */
  describe('Property 4: Password hashing produces irreversible unique hashes', () => {
    // Use actual bcrypt (not mocked) with low salt rounds for fast testing
    const actualBcrypt = jest.requireActual('bcrypt') as typeof bcrypt;
    const SALT_ROUNDS = 4; // Low for test speed; property holds regardless of rounds

    it('should produce a hash that differs from the plaintext', async () => {
      await fc.assert(
        fc.asyncProperty(validPasswordArb, async (password) => {
          const hash = await actualBcrypt.hash(password, SALT_ROUNDS);
          expect(hash).not.toBe(password);
        }),
        { numRuns: 100 }
      );
    }, 60000);

    it('should produce different hashes for the same password (unique salt)', async () => {
      await fc.assert(
        fc.asyncProperty(validPasswordArb, async (password) => {
          const hash1 = await actualBcrypt.hash(password, SALT_ROUNDS);
          const hash2 = await actualBcrypt.hash(password, SALT_ROUNDS);
          expect(hash1).not.toBe(hash2);
        }),
        { numRuns: 100 }
      );
    }, 60000);

    it('should produce hashes that verify against the original password', async () => {
      await fc.assert(
        fc.asyncProperty(validPasswordArb, async (password) => {
          const hash = await actualBcrypt.hash(password, SALT_ROUNDS);
          const isValid = await actualBcrypt.compare(password, hash);
          expect(isValid).toBe(true);
        }),
        { numRuns: 100 }
      );
    }, 60000);
  });
});
