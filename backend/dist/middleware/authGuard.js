"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authGuard = authGuard;
/**
 * Authentication guard middleware.
 * Checks if the request has a valid session with user data.
 * If valid, attaches user info to req.user and calls next().
 * If missing or invalid, responds with 401.
 */
function authGuard(req, res, next) {
    if (!req.session || !req.session.user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
    }
    // Attach user to request for downstream handlers
    req.user = req.session.user;
    next();
}
//# sourceMappingURL=authGuard.js.map