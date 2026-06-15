"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.register = register;
exports.login = login;
exports.logout = logout;
const express_validator_1 = require("express-validator");
const authService = __importStar(require("../services/authService"));
const rateLimiter_1 = require("../middleware/rateLimiter");
/**
 * Maps express-validator errors to the standard error response format.
 */
function formatValidationErrors(errors) {
    const fieldErrors = errors.array().map((err) => ({
        field: err.path,
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
async function register(req, res, next) {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            res.status(400).json(formatValidationErrors(errors));
            return;
        }
        const { email, name, password } = req.body;
        const result = await authService.register(email, name, password);
        res.status(201).json({ data: result });
    }
    catch (err) {
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
async function login(req, res, next) {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            res.status(400).json(formatValidationErrors(errors));
            return;
        }
        const { email, password } = req.body;
        const result = await authService.login(email, password);
        // Store user in session
        req.session.user = result.user;
        // Reset rate limit on successful login
        (0, rateLimiter_1.resetRateLimit)(email);
        res.status(200).json({ data: result });
    }
    catch (err) {
        // Record failed attempt for rate limiting
        if (req.body.email) {
            (0, rateLimiter_1.recordFailedAttempt)(req.body.email);
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
async function logout(req, res, next) {
    try {
        req.session.destroy((err) => {
            if (err) {
                next(err);
                return;
            }
            res.clearCookie('connect.sid');
            res.status(200).json({ data: { message: 'Logged out successfully' } });
        });
    }
    catch (err) {
        next(err);
    }
}
function isPostgresError(err) {
    return typeof err === 'object' && err !== null && 'code' in err;
}
function isAppError(err) {
    return err instanceof Error && 'statusCode' in err;
}
//# sourceMappingURL=authController.js.map