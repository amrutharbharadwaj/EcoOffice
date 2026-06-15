import { Request, Response, NextFunction } from 'express';

/**
 * Express session augmentation to include user data.
 */
declare module 'express-session' {
  interface SessionData {
    user?: {
      id: number;
      email: string;
      name: string;
      role: string;
    };
  }
}

/**
 * Augment Express Request to include user property
 * attached by the auth guard after session validation.
 */
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        email: string;
        name: string;
        role: string;
      };
    }
  }
}

/**
 * Authentication guard middleware.
 * Checks if the request has a valid session with user data.
 * If valid, attaches user info to req.user and calls next().
 * If missing or invalid, responds with 401.
 */
export function authGuard(req: Request, res: Response, next: NextFunction): void {
  if (!req.session || !req.session.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  // Attach user to request for downstream handlers
  req.user = req.session.user;
  next();
}
