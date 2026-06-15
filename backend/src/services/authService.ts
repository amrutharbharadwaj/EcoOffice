import bcrypt from 'bcrypt';
import pool from '../db/pool';

const SALT_ROUNDS = 12;

export interface UserRecord {
  id: number;
  email: string;
  name: string;
  role: string;
  created_at: Date;
  updated_at: Date;
}

/**
 * Registers a new user with hashed password.
 * Returns the created user (without password_hash).
 */
export async function register(
  email: string,
  name: string,
  password: string
): Promise<{ user: UserRecord }> {
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  const result = await pool.query(
    `INSERT INTO users (email, name, password_hash)
     VALUES ($1, $2, $3)
     RETURNING id, email, name, role, created_at, updated_at`,
    [email.toLowerCase().trim(), name.trim(), passwordHash]
  );

  return { user: result.rows[0] };
}

/**
 * Authenticates a user by email and password.
 * Returns user data to be stored in session on success.
 * Throws a generic error on failure (never reveals which field was wrong).
 */
export async function login(
  email: string,
  password: string
): Promise<{ user: UserRecord }> {
  const result = await pool.query(
    `SELECT id, email, name, password_hash, role, created_at, updated_at
     FROM users WHERE email = $1`,
    [email.toLowerCase().trim()]
  );

  const user = result.rows[0];

  if (!user) {
    // Perform a dummy hash comparison to prevent timing attacks
    await bcrypt.hash(password, SALT_ROUNDS);
    throw createAuthError();
  }

  const isValid = await bcrypt.compare(password, user.password_hash);

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
export async function logout(sessionId: string): Promise<void> {
  await pool.query(`DELETE FROM sessions WHERE sid = $1`, [sessionId]);
}

/**
 * Validates a session by checking if it exists and hasn't expired.
 * Returns the user data stored in the session, or null if invalid/expired.
 */
export async function validateSession(
  sessionId: string
): Promise<{ user: UserRecord } | null> {
  const result = await pool.query(
    `SELECT sess, expire FROM sessions WHERE sid = $1`,
    [sessionId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const { sess, expire } = result.rows[0];

  // Check expiry
  if (new Date(expire) < new Date()) {
    // Session expired — clean it up
    await pool.query(`DELETE FROM sessions WHERE sid = $1`, [sessionId]);
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
function createAuthError(): Error & { statusCode: number } {
  const err = new Error('Invalid email or password') as Error & { statusCode: number };
  err.statusCode = 401;
  return err;
}
