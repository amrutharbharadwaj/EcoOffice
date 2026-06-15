import bcrypt from 'bcrypt';
import * as authService from './authService';
import pool from '../db/pool';

// Mock the database pool
jest.mock('../db/pool', () => ({
  query: jest.fn(),
}));

const mockPool = pool as jest.Mocked<typeof pool>;

describe('authService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should create a user with hashed password and return user data', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
        role: 'user',
        created_at: new Date(),
        updated_at: new Date(),
      };

      (mockPool.query as jest.Mock).mockResolvedValue({ rows: [mockUser] });

      const result = await authService.register('Test@Example.com', 'Test User', 'password123');

      expect(result.user).toEqual(mockUser);

      // Verify the query was called with correct params
      const callArgs = (mockPool.query as jest.Mock).mock.calls[0];
      expect(callArgs[0]).toContain('INSERT INTO users');
      expect(callArgs[1][0]).toBe('test@example.com'); // normalized email
      expect(callArgs[1][1]).toBe('Test User');
      // Password hash should not be the plain password
      expect(callArgs[1][2]).not.toBe('password123');
    });

    it('should produce a bcrypt hash that differs from plaintext', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        name: 'Test',
        role: 'user',
        created_at: new Date(),
        updated_at: new Date(),
      };

      (mockPool.query as jest.Mock).mockResolvedValue({ rows: [mockUser] });

      await authService.register('test@example.com', 'Test', 'mypassword');

      const callArgs = (mockPool.query as jest.Mock).mock.calls[0];
      const storedHash = callArgs[1][2];

      expect(storedHash).not.toBe('mypassword');
      // Verify it's a valid bcrypt hash
      const isValid = await bcrypt.compare('mypassword', storedHash);
      expect(isValid).toBe(true);
    });

    it('should trim and lowercase email', async () => {
      const mockUser = {
        id: 1,
        email: 'user@test.com',
        name: 'User',
        role: 'user',
        created_at: new Date(),
        updated_at: new Date(),
      };

      (mockPool.query as jest.Mock).mockResolvedValue({ rows: [mockUser] });

      await authService.register('  User@TEST.com  ', '  User  ', 'password123');

      const callArgs = (mockPool.query as jest.Mock).mock.calls[0];
      expect(callArgs[1][0]).toBe('user@test.com');
      expect(callArgs[1][1]).toBe('User');
    });
  });

  describe('login', () => {
    it('should return user data when credentials are valid', async () => {
      const passwordHash = await bcrypt.hash('correctpass', 12);
      const dbUser = {
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
        password_hash: passwordHash,
        role: 'user',
        created_at: new Date(),
        updated_at: new Date(),
      };

      (mockPool.query as jest.Mock).mockResolvedValue({ rows: [dbUser] });

      const result = await authService.login('test@example.com', 'correctpass');

      expect(result.user.id).toBe(1);
      expect(result.user.email).toBe('test@example.com');
      expect((result.user as any).password_hash).toBeUndefined();
    });

    it('should throw generic error for non-existent email', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({ rows: [] });

      await expect(
        authService.login('nonexistent@example.com', 'password')
      ).rejects.toMatchObject({
        message: 'Invalid email or password',
        statusCode: 401,
      });
    });

    it('should throw generic error for wrong password', async () => {
      const passwordHash = await bcrypt.hash('correctpass', 12);
      const dbUser = {
        id: 1,
        email: 'test@example.com',
        name: 'Test',
        password_hash: passwordHash,
        role: 'user',
        created_at: new Date(),
        updated_at: new Date(),
      };

      (mockPool.query as jest.Mock).mockResolvedValue({ rows: [dbUser] });

      await expect(
        authService.login('test@example.com', 'wrongpassword')
      ).rejects.toMatchObject({
        message: 'Invalid email or password',
        statusCode: 401,
      });
    });

    it('should return identical error messages for wrong email and wrong password', async () => {
      // Wrong email
      (mockPool.query as jest.Mock).mockResolvedValue({ rows: [] });
      let emailError: any;
      try {
        await authService.login('wrong@example.com', 'password');
      } catch (e) {
        emailError = e;
      }

      // Wrong password
      const passwordHash = await bcrypt.hash('correctpass', 12);
      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [{
          id: 1,
          email: 'test@example.com',
          name: 'Test',
          password_hash: passwordHash,
          role: 'user',
          created_at: new Date(),
          updated_at: new Date(),
        }],
      });
      let passError: any;
      try {
        await authService.login('test@example.com', 'wrongpass');
      } catch (e) {
        passError = e;
      }

      // Both errors should be identical in structure and message
      expect(emailError.message).toBe(passError.message);
      expect(emailError.statusCode).toBe(passError.statusCode);
    });
  });

  describe('logout', () => {
    it('should delete the session from the database', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({ rows: [] });

      await authService.logout('session-id-123');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM sessions'),
        ['session-id-123']
      );
    });
  });

  describe('validateSession', () => {
    it('should return user data for valid non-expired session', async () => {
      const futureExpire = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const sessionData = {
        user: { id: 1, email: 'test@example.com', name: 'Test', role: 'user' },
      };

      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [{ sess: sessionData, expire: futureExpire }],
      });

      const result = await authService.validateSession('valid-session-id');

      expect(result).not.toBeNull();
      expect(result!.user.email).toBe('test@example.com');
    });

    it('should return null for non-existent session', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({ rows: [] });

      const result = await authService.validateSession('nonexistent-id');

      expect(result).toBeNull();
    });

    it('should return null and delete expired session', async () => {
      const pastExpire = new Date(Date.now() - 1000);
      const sessionData = {
        user: { id: 1, email: 'test@example.com', name: 'Test', role: 'user' },
      };

      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [{ sess: sessionData, expire: pastExpire }],
      });

      const result = await authService.validateSession('expired-session-id');

      expect(result).toBeNull();
      // Should have been called twice: SELECT and DELETE
      expect(mockPool.query).toHaveBeenCalledTimes(2);
    });

    it('should return null when session has no user data', async () => {
      const futureExpire = new Date(Date.now() + 24 * 60 * 60 * 1000);

      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [{ sess: { cookie: {} }, expire: futureExpire }],
      });

      const result = await authService.validateSession('no-user-session');

      expect(result).toBeNull();
    });
  });
});
