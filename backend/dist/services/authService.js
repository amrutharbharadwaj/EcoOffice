"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.register = register;
exports.login = login;
exports.logout = logout;
exports.validateSession = validateSession;
const bcrypt_1 = __importDefault(require("bcrypt"));
const pool_1 = __importDefault(require("../db/pool"));
const SALT_ROUNDS = 12;
/**
 * Registers a new user with hashed password.
 * Returns the created user (without password_hash).
 */
async function register(email, name, password) {
    const passwordHash = await bcrypt_1.default.hash(password, SALT_ROUNDS);
    const result = await pool_1.default.query(`INSERT INTO users (email, name, password_hash)
     VALUES ($1, $2, $3)
     RETURNING id, email, name, role, created_at, updated_at`, [email.toLowerCase().trim(), name.trim(), passwordHash]);
    return { user: result.rows[0] };
}
/**
 * Authenticates a user by email and password.
 * Returns user data to be stored in session on success.
 * Throws a generic error on failure (never reveals which field was wrong).
 */
async function login(email, password) {
    const result = await pool_1.default.query(`SELECT id, email, name, password_hash, role, created_at, updated_at
     FROM users WHERE email = $1`, [email.toLowerCase().trim()]);
    const user = result.rows[0];
    if (!user) {
        // Perform a dummy hash comparison to prevent timing attacks
        await bcrypt_1.default.hash(password, SALT_ROUNDS);
        throw createAuthError();
    }
    const isValid = await bcrypt_1.default.compare(password, user.password_hash);
    if (!isValid) {
        throw createAuthError();
    }
    // Return user without password_hash
    const { password_hash, ...safeUser } = user;
    return { user: safeUser };
}
/**
 * Destroys a session by session ID.
 */
async function logout(sessionId) {
    await pool_1.default.query(`DELETE FROM sessions WHERE sid = $1`, [sessionId]);
}
/**
 * Validates a session by checking if it exists and hasn't expired.
 * Returns the user data stored in the session, or null if invalid/expired.
 */
async function validateSession(sessionId) {
    const result = await pool_1.default.query(`SELECT sess, expire FROM sessions WHERE sid = $1`, [sessionId]);
    if (result.rows.length === 0) {
        return null;
    }
    const { sess, expire } = result.rows[0];
    // Check expiry
    if (new Date(expire) < new Date()) {
        // Session expired — clean it up
        await pool_1.default.query(`DELETE FROM sessions WHERE sid = $1`, [sessionId]);
        return null;
    }
    // The session data is stored as JSON by connect-pg-simple
    const sessionData = typeof sess === 'string' ? JSON.parse(sess) : sess;
    if (!sessionData?.user) {
        return null;
    }
    return { user: sessionData.user };
}
/**
 * Creates a consistent authentication error (never reveals which field was wrong).
 */
function createAuthError() {
    const err = new Error('Invalid email or password');
    err.statusCode = 401;
    return err;
}
//# sourceMappingURL=authService.js.map