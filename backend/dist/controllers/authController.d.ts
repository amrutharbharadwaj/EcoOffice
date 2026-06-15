import { Request, Response, NextFunction } from 'express';
/**
 * POST /api/v1/auth/register
 * Creates a new user account.
 * Returns 201 on success, 400 on validation error, 409 on duplicate email.
 */
export declare function register(req: Request, res: Response, next: NextFunction): Promise<void>;
/**
 * POST /api/v1/auth/login
 * Authenticates a user and creates a session.
 * Returns 200 on success, 400 on validation error, 401 on invalid credentials, 429 on rate limit.
 */
export declare function login(req: Request, res: Response, next: NextFunction): Promise<void>;
/**
 * POST /api/v1/auth/logout
 * Destroys the current session.
 * Returns 200 on success, 401 if not authenticated.
 */
export declare function logout(req: Request, res: Response, next: NextFunction): Promise<void>;
//# sourceMappingURL=authController.d.ts.map