import { Request, Response, NextFunction } from 'express';

/**
 * Authorization guard middleware for admin-only routes.
 * Must be used after authGuard (which sets req.user).
 * Checks if the authenticated user has the 'admin' role.
 * Returns 403 if the user is not an admin.
 */
export function adminGuard(req: Request, res: Response, next: NextFunction): void {
  if (!req.user || req.user.role !== 'admin') {
    res.status(403).json({ error: 'Access denied' });
    return;
  }

  next();
}
