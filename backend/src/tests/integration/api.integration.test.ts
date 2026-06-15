import request from 'supertest';
import express, { Request, Response, NextFunction } from 'express';
import { attachErrorHandler } from '../../app';

/**
 * Integration tests for all 16 API endpoints.
 * Uses mocked services (consistent with existing test patterns) since no test database is available.
 * Tests verify HTTP status codes per Requirement 11.2: 200, 201, 400, 401, 403, 404, 409.
 *
 * Validates: Requirements 15.2, 10.1, 10.2
 */

// Mock all services
jest.mock('../../services/authService');
jest.mock('../../services/bookingService');
jest.mock('../../services/resourceService');
jest.mock('../../middleware/rateLimiter', () => ({
  loginRateLimiter: (_req: any, _res: any, next: any) => next(),
  recordFailedAttempt: jest.fn(),
  resetRateLimit: jest.fn(),
  checkRateLimit: jest.fn().mockReturnValue({ allowed: true }),
  clearRateLimitStore: jest.fn(),
}));

import * as authService from '../../services/authService';
import * as bookingService from '../../services/bookingService';
import * as resourceService from '../../services/resourceService';
import { loginRateLimiter, checkRateLimit } from '../../middleware/rateLimiter';

const mockedAuthService = authService as jest.Mocked<typeof authService>;
const mockedBookingService = bookingService as jest.Mocked<typeof bookingService>;
const mockedResourceService = resourceService as jest.Mocked<typeof resourceService>;
const mockedCheckRateLimit = checkRateLimit as jest.MockedFunction<typeof checkRateLimit>;

// Helpers to build test apps with different auth contexts

function createTestApp(options?: { authenticated?: boolean; role?: string; userId?: number }) {
  const app = express();

  // Replicate content-type enforcement from app.ts
  app.use((req: Request, res: Response, next: NextFunction) => {
    const hasBody = req.headers['content-length'] && parseInt(req.headers['content-length'], 10) > 0;
    const isTransferEncoded = !!req.headers['transfer-encoding'];

    if ((hasBody || isTransferEncoded) && !req.is('application/json')) {
      res.status(400).json({ error: 'Content-Type must be application/json' });
      return;
    }
    next();
  });

  app.use(express.json());

  // Simulate session/auth middleware
  if (options?.authenticated !== false) {
    app.use((req: Request, _res: Response, next: NextFunction) => {
      req.session = { user: { id: options?.userId || 1, email: 'test@example.com', name: 'Test User', role: options?.role || 'user' } } as any;
      req.user = { id: options?.userId || 1, email: 'test@example.com', name: 'Test User', role: options?.role || 'user' };
      next();
    });
  }

  // Mount routes
  const apiRouter = require('../../routes/index').default;
  app.use('/api/v1', apiRouter);

  attachErrorHandler(app);
  return app;
}

function createUnauthenticatedApp() {
  const app = express();

  app.use((req: Request, res: Response, next: NextFunction) => {
    const hasBody = req.headers['content-length'] && parseInt(req.headers['content-length'], 10) > 0;
    const isTransferEncoded = !!req.headers['transfer-encoding'];

    if ((hasBody || isTransferEncoded) && !req.is('application/json')) {
      res.status(400).json({ error: 'Content-Type must be application/json' });
      return;
    }
    next();
  });

  app.use(express.json());

  // No session — unauthenticated
  app.use((req: Request, _res: Response, next: NextFunction) => {
    req.session = {} as any;
    next();
  });

  const apiRouter = require('../../routes/index').default;
  app.use('/api/v1', apiRouter);

  attachErrorHandler(app);
  return app;
}

describe('API Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================
  // AUTH ENDPOINTS
  // ============================================================

  describe('POST /api/v1/auth/register', () => {
    it('should return 201 with user data on valid registration', async () => {
      const app = createTestApp();
      const mockUser = {
        id: 1,
        email: 'new@example.com',
        name: 'New User',
        role: 'user',
        created_at: new Date(),
        updated_at: new Date(),
      };
      mockedAuthService.register.mockResolvedValue({ user: mockUser });

      const res = await request(app)
        .post('/api/v1/auth/register')
        .set('Content-Type', 'application/json')
        .send({ email: 'new@example.com', name: 'New User', password: 'password123' });

      expect(res.status).toBe(201);
      expect(res.body.data.user.email).toBe('new@example.com');
    });

    it('should return 400 when required fields are missing', async () => {
      const app = createTestApp();

      const res = await request(app)
        .post('/api/v1/auth/register')
        .set('Content-Type', 'application/json')
        .send({ email: 'test@example.com' }); // missing name and password

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });

    it('should return 400 when email format is invalid', async () => {
      const app = createTestApp();

      const res = await request(app)
        .post('/api/v1/auth/register')
        .set('Content-Type', 'application/json')
        .send({ email: 'not-an-email', name: 'Test', password: 'password123' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });

    it('should return 400 when password is too short', async () => {
      const app = createTestApp();

      const res = await request(app)
        .post('/api/v1/auth/register')
        .set('Content-Type', 'application/json')
        .send({ email: 'test@example.com', name: 'Test', password: '1234567' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });

    it('should return 409 when email already exists', async () => {
      const app = createTestApp();
      const err: any = new Error('duplicate key');
      err.code = '23505';
      mockedAuthService.register.mockRejectedValue(err);

      const res = await request(app)
        .post('/api/v1/auth/register')
        .set('Content-Type', 'application/json')
        .send({ email: 'existing@example.com', name: 'Test', password: 'password123' });

      expect(res.status).toBe(409);
      expect(res.body.error).toContain('already registered');
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('should return 200 with user data on valid login', async () => {
      const app = createTestApp();
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
        role: 'user',
        created_at: new Date(),
        updated_at: new Date(),
      };
      mockedAuthService.login.mockResolvedValue({ user: mockUser });

      const res = await request(app)
        .post('/api/v1/auth/login')
        .set('Content-Type', 'application/json')
        .send({ email: 'test@example.com', password: 'password123' });

      expect(res.status).toBe(200);
      expect(res.body.data.user.email).toBe('test@example.com');
    });

    it('should return 401 when credentials are invalid', async () => {
      const app = createTestApp();
      const err = new Error('Invalid email or password') as Error & { statusCode: number };
      err.statusCode = 401;
      mockedAuthService.login.mockRejectedValue(err);

      const res = await request(app)
        .post('/api/v1/auth/login')
        .set('Content-Type', 'application/json')
        .send({ email: 'test@example.com', password: 'wrongpassword' });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Invalid email or password');
    });

    it('should return 400 when email is missing', async () => {
      const app = createTestApp();

      const res = await request(app)
        .post('/api/v1/auth/login')
        .set('Content-Type', 'application/json')
        .send({ password: 'password123' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    it('should return 200 on successful logout', async () => {
      const app = express();
      app.use(express.json());
      // Simulate authenticated session with destroy
      app.use((req: Request, _res: Response, next: NextFunction) => {
        req.session = {
          user: { id: 1, email: 'test@example.com', name: 'Test User', role: 'user' },
          destroy: (cb: (err?: any) => void) => cb(),
        } as any;
        req.user = { id: 1, email: 'test@example.com', name: 'Test User', role: 'user' };
        next();
      });
      const apiRouter = require('../../routes/index').default;
      app.use('/api/v1', apiRouter);
      attachErrorHandler(app);

      const res = await request(app)
        .post('/api/v1/auth/logout')
        .set('Content-Type', 'application/json');

      expect(res.status).toBe(200);
      expect(res.body.data.message).toContain('Logged out');
    });

    it('should return 401 when not authenticated', async () => {
      const app = createUnauthenticatedApp();

      const res = await request(app)
        .post('/api/v1/auth/logout')
        .set('Content-Type', 'application/json');

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Authentication required');
    });
  });

  // ============================================================
  // BOOKING ENDPOINTS
  // ============================================================

  describe('POST /api/v1/bookings/desks', () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 5);
    const futureDateStr = futureDate.toISOString().split('T')[0];

    it('should return 201 on successful desk booking', async () => {
      const app = createTestApp();
      mockedBookingService.createDeskBooking.mockResolvedValue({
        booking: {
          id: 1,
          user_id: 1,
          resource_type: 'desk',
          resource_id: 1,
          booking_date: futureDateStr,
          created_at: new Date(),
          updated_at: new Date(),
        },
      });

      const res = await request(app)
        .post('/api/v1/bookings/desks')
        .set('Content-Type', 'application/json')
        .send({ deskId: 1, date: futureDateStr });

      expect(res.status).toBe(201);
      expect(res.body.data.booking).toBeDefined();
    });

    it('should return 400 when deskId is missing', async () => {
      const app = createTestApp();

      const res = await request(app)
        .post('/api/v1/bookings/desks')
        .set('Content-Type', 'application/json')
        .send({ date: futureDateStr });

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });

    it('should return 400 when date format is invalid', async () => {
      const app = createTestApp();

      const res = await request(app)
        .post('/api/v1/bookings/desks')
        .set('Content-Type', 'application/json')
        .send({ deskId: 1, date: 'not-a-date' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });

    it('should return 404 when desk does not exist', async () => {
      const app = createTestApp();
      const err = new Error('Desk not found') as Error & { statusCode: number };
      err.statusCode = 404;
      mockedBookingService.createDeskBooking.mockRejectedValue(err);

      const res = await request(app)
        .post('/api/v1/bookings/desks')
        .set('Content-Type', 'application/json')
        .send({ deskId: 9999, date: futureDateStr });

      expect(res.status).toBe(404);
      expect(res.body.error).toContain('not found');
    });

    it('should return 409 when desk is already booked (double-booking)', async () => {
      const app = createTestApp();
      const err = new Error('Desk is already booked for this date') as Error & { statusCode: number };
      err.statusCode = 409;
      mockedBookingService.createDeskBooking.mockRejectedValue(err);

      const res = await request(app)
        .post('/api/v1/bookings/desks')
        .set('Content-Type', 'application/json')
        .send({ deskId: 1, date: futureDateStr });

      expect(res.status).toBe(409);
      expect(res.body.error).toContain('already booked');
    });

    it('should return 401 when not authenticated', async () => {
      const app = createUnauthenticatedApp();

      const res = await request(app)
        .post('/api/v1/bookings/desks')
        .set('Content-Type', 'application/json')
        .send({ deskId: 1, date: futureDateStr });

      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/v1/bookings/parking', () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 5);
    const futureDateStr = futureDate.toISOString().split('T')[0];

    it('should return 201 on successful parking booking', async () => {
      const app = createTestApp();
      mockedBookingService.createParkingBooking.mockResolvedValue({
        booking: {
          id: 2,
          user_id: 1,
          resource_type: 'parking_spot',
          resource_id: 1,
          booking_date: futureDateStr,
          created_at: new Date(),
          updated_at: new Date(),
        },
      });

      const res = await request(app)
        .post('/api/v1/bookings/parking')
        .set('Content-Type', 'application/json')
        .send({ parkingSpotId: 1, date: futureDateStr });

      expect(res.status).toBe(201);
      expect(res.body.data.booking).toBeDefined();
    });

    it('should return 400 when parkingSpotId is missing', async () => {
      const app = createTestApp();

      const res = await request(app)
        .post('/api/v1/bookings/parking')
        .set('Content-Type', 'application/json')
        .send({ date: futureDateStr });

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });

    it('should return 409 when parking spot is already booked', async () => {
      const app = createTestApp();
      const err = new Error('Parking spot is already booked for this date') as Error & { statusCode: number };
      err.statusCode = 409;
      mockedBookingService.createParkingBooking.mockRejectedValue(err);

      const res = await request(app)
        .post('/api/v1/bookings/parking')
        .set('Content-Type', 'application/json')
        .send({ parkingSpotId: 1, date: futureDateStr });

      expect(res.status).toBe(409);
      expect(res.body.error).toContain('already booked');
    });

    it('should return 401 when not authenticated', async () => {
      const app = createUnauthenticatedApp();

      const res = await request(app)
        .post('/api/v1/bookings/parking')
        .set('Content-Type', 'application/json')
        .send({ parkingSpotId: 1, date: futureDateStr });

      expect(res.status).toBe(401);
    });
  });

  describe('DELETE /api/v1/bookings/:id', () => {
    it('should return 200 on successful booking cancellation', async () => {
      const app = createTestApp();
      mockedBookingService.cancelBooking.mockResolvedValue(undefined);

      const res = await request(app)
        .delete('/api/v1/bookings/1');

      expect(res.status).toBe(200);
      expect(res.body.data.message).toContain('cancelled');
    });

    it('should return 404 when booking does not exist', async () => {
      const app = createTestApp();
      const err = new Error('Booking not found') as Error & { statusCode: number };
      err.statusCode = 404;
      mockedBookingService.cancelBooking.mockRejectedValue(err);

      const res = await request(app)
        .delete('/api/v1/bookings/9999');

      expect(res.status).toBe(404);
      expect(res.body.error).toContain('not found');
    });

    it('should return 403 when user does not own the booking', async () => {
      const app = createTestApp();
      const err = new Error('Access denied') as Error & { statusCode: number };
      err.statusCode = 403;
      mockedBookingService.cancelBooking.mockRejectedValue(err);

      const res = await request(app)
        .delete('/api/v1/bookings/5');

      expect(res.status).toBe(403);
      expect(res.body.error).toContain('denied');
    });

    it('should return 400 when booking ID is not a number', async () => {
      const app = createTestApp();

      const res = await request(app)
        .delete('/api/v1/bookings/abc');

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Invalid booking ID');
    });

    it('should return 401 when not authenticated', async () => {
      const app = createUnauthenticatedApp();

      const res = await request(app)
        .delete('/api/v1/bookings/1');

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/v1/bookings/mine', () => {
    it('should return 200 with user bookings', async () => {
      const app = createTestApp();
      mockedBookingService.getUserBookings.mockResolvedValue([
        {
          id: 1,
          user_id: 1,
          resource_type: 'desk',
          resource_id: 1,
          booking_date: '2024-12-20',
          resource_identifier: 'D-101',
          created_at: new Date(),
          updated_at: new Date(),
        },
      ]);

      const res = await request(app)
        .get('/api/v1/bookings/mine');

      expect(res.status).toBe(200);
      expect(res.body.data.bookings).toHaveLength(1);
      expect(res.body.data.bookings[0].resource_type).toBe('desk');
    });

    it('should return 200 with empty array when no bookings exist', async () => {
      const app = createTestApp();
      mockedBookingService.getUserBookings.mockResolvedValue([]);

      const res = await request(app)
        .get('/api/v1/bookings/mine');

      expect(res.status).toBe(200);
      expect(res.body.data.bookings).toEqual([]);
      expect(res.body.data.message).toBe('No upcoming bookings found');
    });

    it('should return 401 when not authenticated', async () => {
      const app = createUnauthenticatedApp();

      const res = await request(app)
        .get('/api/v1/bookings/mine');

      expect(res.status).toBe(401);
    });
  });

  // ============================================================
  // AVAILABILITY ENDPOINTS
  // ============================================================

  describe('GET /api/v1/availability/desks', () => {
    it('should return 200 with desk availability for a valid date', async () => {
      const app = createTestApp();
      mockedBookingService.getDeskAvailability.mockResolvedValue([
        { id: 1, identifier: 'D-101', floor: 1, status: 'available' },
        { id: 2, identifier: 'D-102', floor: 1, status: 'booked' },
      ]);

      const res = await request(app)
        .get('/api/v1/availability/desks?date=2024-12-20');

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.data[0].status).toBe('available');
    });

    it('should return 400 when date parameter is missing', async () => {
      const app = createTestApp();

      const res = await request(app)
        .get('/api/v1/availability/desks');

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });

    it('should return 400 when date format is invalid', async () => {
      const app = createTestApp();

      const res = await request(app)
        .get('/api/v1/availability/desks?date=invalid-date');

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });

    it('should return 401 when not authenticated', async () => {
      const app = createUnauthenticatedApp();

      const res = await request(app)
        .get('/api/v1/availability/desks?date=2024-12-20');

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/v1/availability/parking', () => {
    it('should return 200 with parking availability for a valid date', async () => {
      const app = createTestApp();
      mockedBookingService.getParkingAvailability.mockResolvedValue([
        { id: 1, identifier: 'P-A1', location_label: 'Level A', status: 'available' },
        { id: 2, identifier: 'P-A2', location_label: 'Level A', status: 'booked' },
      ]);

      const res = await request(app)
        .get('/api/v1/availability/parking?date=2024-12-20');

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.data[0].status).toBe('available');
    });

    it('should return 400 when date parameter is missing', async () => {
      const app = createTestApp();

      const res = await request(app)
        .get('/api/v1/availability/parking');

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });

    it('should return 401 when not authenticated', async () => {
      const app = createUnauthenticatedApp();

      const res = await request(app)
        .get('/api/v1/availability/parking?date=2024-12-20');

      expect(res.status).toBe(401);
    });
  });

  // ============================================================
  // ADMIN ENDPOINTS
  // ============================================================

  describe('POST /api/v1/admin/desks', () => {
    it('should return 201 on successful desk creation (admin)', async () => {
      const app = createTestApp({ authenticated: true, role: 'admin' });
      mockedResourceService.addDesk.mockResolvedValue({
        desk: {
          id: 1,
          identifier: 'D-201',
          floor: 2,
          is_active: true,
          created_at: new Date(),
          updated_at: new Date(),
        },
      });

      const res = await request(app)
        .post('/api/v1/admin/desks')
        .set('Content-Type', 'application/json')
        .send({ identifier: 'D-201', floor: 2 });

      expect(res.status).toBe(201);
      expect(res.body.data.desk.identifier).toBe('D-201');
    });

    it('should return 400 when identifier is missing', async () => {
      const app = createTestApp({ authenticated: true, role: 'admin' });

      const res = await request(app)
        .post('/api/v1/admin/desks')
        .set('Content-Type', 'application/json')
        .send({ floor: 2 });

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });

    it('should return 409 when identifier already exists', async () => {
      const app = createTestApp({ authenticated: true, role: 'admin' });
      const err = new Error('Identifier already in use') as Error & { statusCode: number };
      err.statusCode = 409;
      mockedResourceService.addDesk.mockRejectedValue(err);

      const res = await request(app)
        .post('/api/v1/admin/desks')
        .set('Content-Type', 'application/json')
        .send({ identifier: 'D-201', floor: 2 });

      expect(res.status).toBe(409);
      expect(res.body.error).toContain('already in use');
    });

    it('should return 403 when user is not admin', async () => {
      const app = createTestApp({ authenticated: true, role: 'user' });

      const res = await request(app)
        .post('/api/v1/admin/desks')
        .set('Content-Type', 'application/json')
        .send({ identifier: 'D-201', floor: 2 });

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('Access denied');
    });

    it('should return 401 when not authenticated', async () => {
      const app = createUnauthenticatedApp();

      const res = await request(app)
        .post('/api/v1/admin/desks')
        .set('Content-Type', 'application/json')
        .send({ identifier: 'D-201', floor: 2 });

      expect(res.status).toBe(401);
    });
  });

  describe('PUT /api/v1/admin/desks/:id', () => {
    it('should return 200 on successful desk update (admin)', async () => {
      const app = createTestApp({ authenticated: true, role: 'admin' });
      mockedResourceService.updateDesk.mockResolvedValue({
        desk: {
          id: 1,
          identifier: 'D-201-Updated',
          floor: 3,
          is_active: true,
          created_at: new Date(),
          updated_at: new Date(),
        },
      });

      const res = await request(app)
        .put('/api/v1/admin/desks/1')
        .set('Content-Type', 'application/json')
        .send({ identifier: 'D-201-Updated', floor: 3 });

      expect(res.status).toBe(200);
      expect(res.body.data.desk.identifier).toBe('D-201-Updated');
    });

    it('should return 404 when desk does not exist', async () => {
      const app = createTestApp({ authenticated: true, role: 'admin' });
      const err = new Error('Desk not found') as Error & { statusCode: number };
      err.statusCode = 404;
      mockedResourceService.updateDesk.mockRejectedValue(err);

      const res = await request(app)
        .put('/api/v1/admin/desks/9999')
        .set('Content-Type', 'application/json')
        .send({ identifier: 'D-999' });

      expect(res.status).toBe(404);
      expect(res.body.error).toContain('not found');
    });

    it('should return 403 when user is not admin', async () => {
      const app = createTestApp({ authenticated: true, role: 'user' });

      const res = await request(app)
        .put('/api/v1/admin/desks/1')
        .set('Content-Type', 'application/json')
        .send({ identifier: 'D-201' });

      expect(res.status).toBe(403);
    });
  });

  describe('DELETE /api/v1/admin/desks/:id', () => {
    it('should return 200 on successful desk deactivation (admin)', async () => {
      const app = createTestApp({ authenticated: true, role: 'admin' });
      mockedResourceService.deactivateDesk.mockResolvedValue(undefined);

      const res = await request(app)
        .delete('/api/v1/admin/desks/1');

      expect(res.status).toBe(200);
      expect(res.body.data.message).toContain('deactivated');
    });

    it('should return 404 when desk not found', async () => {
      const app = createTestApp({ authenticated: true, role: 'admin' });
      const err = new Error('Desk not found') as Error & { statusCode: number };
      err.statusCode = 404;
      mockedResourceService.deactivateDesk.mockRejectedValue(err);

      const res = await request(app)
        .delete('/api/v1/admin/desks/9999');

      expect(res.status).toBe(404);
    });

    it('should return 409 when desk has active bookings', async () => {
      const app = createTestApp({ authenticated: true, role: 'admin' });
      const err = new Error('Resource has active bookings') as Error & { statusCode: number };
      err.statusCode = 409;
      mockedResourceService.deactivateDesk.mockRejectedValue(err);

      const res = await request(app)
        .delete('/api/v1/admin/desks/1');

      expect(res.status).toBe(409);
      expect(res.body.error).toContain('active bookings');
    });

    it('should return 403 when user is not admin', async () => {
      const app = createTestApp({ authenticated: true, role: 'user' });

      const res = await request(app)
        .delete('/api/v1/admin/desks/1');

      expect(res.status).toBe(403);
    });
  });

  describe('POST /api/v1/admin/parking', () => {
    it('should return 201 on successful parking spot creation (admin)', async () => {
      const app = createTestApp({ authenticated: true, role: 'admin' });
      mockedResourceService.addParkingSpot.mockResolvedValue({
        spot: {
          id: 1,
          identifier: 'P-B1',
          location_label: 'Level B',
          is_active: true,
          created_at: new Date(),
          updated_at: new Date(),
        },
      });

      const res = await request(app)
        .post('/api/v1/admin/parking')
        .set('Content-Type', 'application/json')
        .send({ identifier: 'P-B1', locationLabel: 'Level B' });

      expect(res.status).toBe(201);
      expect(res.body.data.spot.identifier).toBe('P-B1');
    });

    it('should return 400 when locationLabel is missing', async () => {
      const app = createTestApp({ authenticated: true, role: 'admin' });

      const res = await request(app)
        .post('/api/v1/admin/parking')
        .set('Content-Type', 'application/json')
        .send({ identifier: 'P-B1' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });

    it('should return 409 when identifier already exists', async () => {
      const app = createTestApp({ authenticated: true, role: 'admin' });
      const err = new Error('Identifier already in use') as Error & { statusCode: number };
      err.statusCode = 409;
      mockedResourceService.addParkingSpot.mockRejectedValue(err);

      const res = await request(app)
        .post('/api/v1/admin/parking')
        .set('Content-Type', 'application/json')
        .send({ identifier: 'P-B1', locationLabel: 'Level B' });

      expect(res.status).toBe(409);
    });

    it('should return 403 when user is not admin', async () => {
      const app = createTestApp({ authenticated: true, role: 'user' });

      const res = await request(app)
        .post('/api/v1/admin/parking')
        .set('Content-Type', 'application/json')
        .send({ identifier: 'P-B1', locationLabel: 'Level B' });

      expect(res.status).toBe(403);
    });
  });

  describe('PUT /api/v1/admin/parking/:id', () => {
    it('should return 200 on successful parking spot update (admin)', async () => {
      const app = createTestApp({ authenticated: true, role: 'admin' });
      mockedResourceService.updateParkingSpot.mockResolvedValue({
        spot: {
          id: 1,
          identifier: 'P-B1-Updated',
          location_label: 'Level B North',
          is_active: true,
          created_at: new Date(),
          updated_at: new Date(),
        },
      });

      const res = await request(app)
        .put('/api/v1/admin/parking/1')
        .set('Content-Type', 'application/json')
        .send({ identifier: 'P-B1-Updated', locationLabel: 'Level B North' });

      expect(res.status).toBe(200);
      expect(res.body.data.spot.identifier).toBe('P-B1-Updated');
    });

    it('should return 404 when parking spot does not exist', async () => {
      const app = createTestApp({ authenticated: true, role: 'admin' });
      const err = new Error('Parking spot not found') as Error & { statusCode: number };
      err.statusCode = 404;
      mockedResourceService.updateParkingSpot.mockRejectedValue(err);

      const res = await request(app)
        .put('/api/v1/admin/parking/9999')
        .set('Content-Type', 'application/json')
        .send({ identifier: 'P-X' });

      expect(res.status).toBe(404);
    });

    it('should return 403 when user is not admin', async () => {
      const app = createTestApp({ authenticated: true, role: 'user' });

      const res = await request(app)
        .put('/api/v1/admin/parking/1')
        .set('Content-Type', 'application/json')
        .send({ identifier: 'P-B1' });

      expect(res.status).toBe(403);
    });
  });

  describe('DELETE /api/v1/admin/parking/:id', () => {
    it('should return 200 on successful parking spot deactivation (admin)', async () => {
      const app = createTestApp({ authenticated: true, role: 'admin' });
      mockedResourceService.deactivateParkingSpot.mockResolvedValue(undefined);

      const res = await request(app)
        .delete('/api/v1/admin/parking/1');

      expect(res.status).toBe(200);
      expect(res.body.data.message).toContain('deactivated');
    });

    it('should return 404 when parking spot not found', async () => {
      const app = createTestApp({ authenticated: true, role: 'admin' });
      const err = new Error('Parking spot not found') as Error & { statusCode: number };
      err.statusCode = 404;
      mockedResourceService.deactivateParkingSpot.mockRejectedValue(err);

      const res = await request(app)
        .delete('/api/v1/admin/parking/9999');

      expect(res.status).toBe(404);
    });

    it('should return 409 when parking spot has active bookings', async () => {
      const app = createTestApp({ authenticated: true, role: 'admin' });
      const err = new Error('Resource has active bookings') as Error & { statusCode: number };
      err.statusCode = 409;
      mockedResourceService.deactivateParkingSpot.mockRejectedValue(err);

      const res = await request(app)
        .delete('/api/v1/admin/parking/1');

      expect(res.status).toBe(409);
    });

    it('should return 403 when user is not admin', async () => {
      const app = createTestApp({ authenticated: true, role: 'user' });

      const res = await request(app)
        .delete('/api/v1/admin/parking/1');

      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/v1/admin/bookings', () => {
    it('should return 200 with booking overview for admin', async () => {
      const app = createTestApp({ authenticated: true, role: 'admin' });
      mockedBookingService.getBookingOverview.mockResolvedValue({
        bookings: [
          {
            id: 1,
            user_name: 'Test User',
            resource_type: 'desk',
            resource_identifier: 'D-101',
            booking_date: '2024-12-20',
          },
        ],
        total: 1,
      });

      const res = await request(app)
        .get('/api/v1/admin/bookings');

      expect(res.status).toBe(200);
      expect(res.body.data.bookings).toHaveLength(1);
      expect(res.body.data.total).toBe(1);
    });

    it('should return 200 with filtering by resourceType', async () => {
      const app = createTestApp({ authenticated: true, role: 'admin' });
      mockedBookingService.getBookingOverview.mockResolvedValue({
        bookings: [],
        total: 0,
      });

      const res = await request(app)
        .get('/api/v1/admin/bookings?resourceType=desk&startDate=2024-12-01&endDate=2024-12-31');

      expect(res.status).toBe(200);
      expect(mockedBookingService.getBookingOverview).toHaveBeenCalledWith({
        startDate: '2024-12-01',
        endDate: '2024-12-31',
        resourceType: 'desk',
      });
    });

    it('should return 400 when resourceType is invalid', async () => {
      const app = createTestApp({ authenticated: true, role: 'admin' });

      const res = await request(app)
        .get('/api/v1/admin/bookings?resourceType=invalid');

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Invalid resourceType');
    });

    it('should return 400 when only startDate is provided', async () => {
      const app = createTestApp({ authenticated: true, role: 'admin' });

      const res = await request(app)
        .get('/api/v1/admin/bookings?startDate=2024-12-01');

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Both startDate and endDate');
    });

    it('should return 403 when user is not admin', async () => {
      const app = createTestApp({ authenticated: true, role: 'user' });

      const res = await request(app)
        .get('/api/v1/admin/bookings');

      expect(res.status).toBe(403);
    });

    it('should return 401 when not authenticated', async () => {
      const app = createUnauthenticatedApp();

      const res = await request(app)
        .get('/api/v1/admin/bookings');

      expect(res.status).toBe(401);
    });
  });

  // ============================================================
  // CONCURRENT BOOKING SCENARIO (Requirement 10.1, 10.2)
  // ============================================================

  describe('Concurrent booking protection', () => {
    it('should handle concurrent desk booking - one succeeds, one fails with 409', async () => {
      const app = createTestApp();
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 5);
      const futureDateStr = futureDate.toISOString().split('T')[0];

      // First call succeeds, second call fails with conflict
      mockedBookingService.createDeskBooking
        .mockResolvedValueOnce({
          booking: {
            id: 1,
            user_id: 1,
            resource_type: 'desk',
            resource_id: 1,
            booking_date: futureDateStr,
            created_at: new Date(),
            updated_at: new Date(),
          },
        })
        .mockRejectedValueOnce(
          Object.assign(new Error('Desk is already booked for this date'), { statusCode: 409 })
        );

      // Send two concurrent requests for the same desk and date
      const [res1, res2] = await Promise.all([
        request(app)
          .post('/api/v1/bookings/desks')
          .set('Content-Type', 'application/json')
          .send({ deskId: 1, date: futureDateStr }),
        request(app)
          .post('/api/v1/bookings/desks')
          .set('Content-Type', 'application/json')
          .send({ deskId: 1, date: futureDateStr }),
      ]);

      // One should be 201, one should be 409
      const statuses = [res1.status, res2.status].sort();
      expect(statuses).toEqual([201, 409]);
    });

    it('should handle concurrent parking booking - one succeeds, one fails with 409', async () => {
      const app = createTestApp();
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 5);
      const futureDateStr = futureDate.toISOString().split('T')[0];

      // First call succeeds, second call fails with conflict
      mockedBookingService.createParkingBooking
        .mockResolvedValueOnce({
          booking: {
            id: 2,
            user_id: 1,
            resource_type: 'parking_spot',
            resource_id: 1,
            booking_date: futureDateStr,
            created_at: new Date(),
            updated_at: new Date(),
          },
        })
        .mockRejectedValueOnce(
          Object.assign(new Error('Parking spot is already booked for this date'), { statusCode: 409 })
        );

      // Send two concurrent requests for the same parking spot and date
      const [res1, res2] = await Promise.all([
        request(app)
          .post('/api/v1/bookings/parking')
          .set('Content-Type', 'application/json')
          .send({ parkingSpotId: 1, date: futureDateStr }),
        request(app)
          .post('/api/v1/bookings/parking')
          .set('Content-Type', 'application/json')
          .send({ parkingSpotId: 1, date: futureDateStr }),
      ]);

      // One should be 201, one should be 409
      const statuses = [res1.status, res2.status].sort();
      expect(statuses).toEqual([201, 409]);
    });
  });

  // ============================================================
  // CROSS-CUTTING CONCERNS
  // ============================================================

  describe('Content-Type enforcement', () => {
    it('should return 400 when Content-Type is not application/json for POST requests', async () => {
      const app = createTestApp();

      const res = await request(app)
        .post('/api/v1/auth/register')
        .set('Content-Type', 'text/plain')
        .send('not json');

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Content-Type');
    });
  });

  describe('Error response consistency', () => {
    it('should return error field in all error responses (401)', async () => {
      const app = createUnauthenticatedApp();

      const res = await request(app).get('/api/v1/bookings/mine');

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('error');
      expect(typeof res.body.error).toBe('string');
    });

    it('should return error field in all error responses (403)', async () => {
      const app = createTestApp({ authenticated: true, role: 'user' });

      const res = await request(app).get('/api/v1/admin/bookings');

      expect(res.status).toBe(403);
      expect(res.body).toHaveProperty('error');
      expect(typeof res.body.error).toBe('string');
    });

    it('should return error and fields in validation error responses (400)', async () => {
      const app = createTestApp();

      const res = await request(app)
        .post('/api/v1/auth/register')
        .set('Content-Type', 'application/json')
        .send({ email: 'not-email', name: '', password: '123' });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
      expect(res.body).toHaveProperty('fields');
      expect(Array.isArray(res.body.fields)).toBe(true);
    });
  });
});
