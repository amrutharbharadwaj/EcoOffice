import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import * as authService from '../services/authService';
import { recordFailedAttempt, resetRateLimit } from '../middleware/rateLimiter';

/**
 * Maps express-validator errors to the standard error response format.
 */
function formatValidationErrors(errors: ReturnType<typeof validationResult>) {
  const fieldErrors = errors.array().map((err) => ({
    field: (err as { path: string }).path,
    message: err.msg,
  }));

  return {
    error: 'Validation failed',
    fields: fieldErrors,
  };
}

/**
 * POST /api/v1/auth/register
 * Creates a new user account.
 * Returns 201 on success, 400 on validation error, 409 on duplicate email.
 */
export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json(formatValidationErrors(errors));
      return;
    }

    const { email, name, password } = req.body;
    const result = await authService.register(email, name, password);

    res.status(201).json({ data: result });
  } catch (err: unknown) {
    // Handle PostgreSQL unique_violation (duplicate email)
    if (isPostgresError(err) && err.code === '23505') {
      res.status(409).json({ error: 'Email is already registered' });
      return;
    }
    next(err);
  }
}

/**
 * POST /api/v1/auth/login
 * Authenticates a user and creates a session.
 * Returns 200 on success, 400 on validation error, 401 on invalid credentials, 429 on rate limit.
 */
export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json(formatValidationErrors(errors));
      return;
    }

    const { email, password } = req.body;
    const result = await authService.login(email, password);

    // Store user in session
    req.session.user = result.user;

    // Reset rate limit on successful login
    resetRateLimit(email);

    res.status(200).json({ data: result });
  } catch (err: unknown) {
    // Record failed attempt for rate limiting
    if (req.body.email) {
      recordFailedAttempt(req.body.email);
    }

    // Forward auth errors with their status code
    if (isAppError(err) && err.statusCode === 401) {
      res.status(401).json({ error: err.message });
      return;
    }
    next(err);
  }
}

/**
 * POST /api/v1/auth/logout
 * Destroys the current session.
 * Returns 200 on success, 401 if not authenticated.
 */
export async function logout(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    req.session.destroy((err) => {
      if (err) {
        next(err);
        return;
      }
      res.clearCookie('connect.sid');
      res.status(200).json({ data: { message: 'Logged out successfully' } });
    });
  } catch (err) {
    next(err);
  }
}

// Type guards

interface PostgresError {
  code: string;
  message: string;
}

interface AppError extends Error {
  statusCode?: number;
}

function isPostgresError(err: unknown): err is PostgresError {
  return typeof err === 'object' && err !== null && 'code' in err;
}

function isAppError(err: unknown): err is AppError {
  return err instanceof Error && 'statusCode' in err;
}
