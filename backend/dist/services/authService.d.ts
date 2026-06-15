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
export declare function register(email: string, name: string, password: string): Promise<{
    user: UserRecord;
}>;
/**
 * Authenticates a user by email and password.
 * Returns user data to be stored in session on success.
 * Throws a generic error on failure (never reveals which field was wrong).
 */
export declare function login(email: string, password: string): Promise<{
    user: UserRecord;
}>;
/**
 * Destroys a session by session ID.
 */
export declare function logout(sessionId: string): Promise<void>;
/**
 * Validates a session by checking if it exists and hasn't expired.
 * Returns the user data stored in the session, or null if invalid/expired.
 */
export declare function validateSession(sessionId: string): Promise<{
    user: UserRecord;
} | null>;
//# sourceMappingURL=authService.d.ts.map