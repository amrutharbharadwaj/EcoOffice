"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminGuard = adminGuard;
/**
 * Authorization guard middleware for admin-only routes.
 * Must be used after authGuard (which sets req.user).
 * Checks if the authenticated user has the 'admin' role.
 * Returns 403 if the user is not an admin.
 */
function adminGuard(req, res, next) {
    if (!req.user || req.user.role !== 'admin') {
        res.status(403).json({ error: 'Access denied' });
        return;
    }
    next();
}
//# sourceMappingURL=adminGuard.js.map