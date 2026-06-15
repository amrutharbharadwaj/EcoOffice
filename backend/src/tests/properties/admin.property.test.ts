import fc from 'fast-check';
import express, { Request, Response, NextFunction } from 'express';
import request from 'supertest';
import pool from '../../db/pool';
import * as resourceService from '../../services/resourceService';
import { getBookingOverview } from '../../services/bookingService';
import { adminGuard } from '../../middleware/adminGuard';

// Mock the database pool
jest.mock('../../db/pool', () => ({
  query: jest.fn(),
}));

const mockPool = pool as jest.Mocked<typeof pool>;

// ─── Arbitraries ────────────────────────────────────────────────────────────

/** Generates a valid resource identifier (1–50 alphanumeric chars). */
const identifierArb = fc.stringOf(
  fc.constantFrom(...'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'.split('')),
  { minLength: 1, maxLength: 50 }
);

/** Generates a valid floor number (integer). */
const floorArb = fc.integer({ min: -5, max: 50 });

/** Generates a valid location label (1–100 chars). */
const locationLabelArb = fc.stringOf(
  fc.constantFrom(...'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 -_'.split('')),
  { minLength: 1, maxLength: 100 }
);

/** Generates a positive integer for IDs. */
const positiveIntArb = fc.integer({ min: 1, max: 10000 });

// ─── Property Tests ─────────────────────────────────────────────────────────

describe('Admin Property Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2025-06-15T12:00:00Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  /**
   * Property 18: Admin resource creation with valid inputs succeeds
   *
   * For any valid resource identifier (1–50 chars, unique) and associated metadata
   * (floor for desks, location_label for parking), an admin creation request SHALL
   * succeed and return the created resource.
   *
   * **Validates: Requirements 8.1, 8.2**
   */
  describe('Property 18: Admin resource creation with valid inputs succeeds', () => {
    it('should create a desk with any valid identifier and floor', async () => {
      await fc.assert(
        fc.asyncProperty(
          identifierArb,
          floorArb,
          positiveIntArb, // returned id
          async (identifier, floor, returnedId) => {
            const mockRow = {
              id: returnedId,
              identifier,
              floor,
              is_active: true,
              created_at: new Date('2025-06-15T12:00:00Z'),
              updated_at: new Date('2025-06-15T12:00:00Z'),
            };

            // Mock successful INSERT
            (mockPool.query as jest.Mock).mockResolvedValueOnce({
              rows: [mockRow],
            });

            const result = await resourceService.addDesk(identifier, floor);

            expect(result.desk).toBeDefined();
            expect(result.desk.identifier).toBe(identifier);
            expect(result.desk.floor).toBe(floor);
            expect(result.desk.is_active).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    }, 60000);

    it('should create a parking spot with any valid identifier and location label', async () => {
      await fc.assert(
        fc.asyncProperty(
          identifierArb,
          locationLabelArb,
          positiveIntArb, // returned id
          async (identifier, locationLabel, returnedId) => {
            const mockRow = {
              id: returnedId,
              identifier,
              location_label: locationLabel,
              is_active: true,
              created_at: new Date('2025-06-15T12:00:00Z'),
              updated_at: new Date('2025-06-15T12:00:00Z'),
            };

            // Mock successful INSERT
            (mockPool.query as jest.Mock).mockResolvedValueOnce({
              rows: [mockRow],
            });

            const result = await resourceService.addParkingSpot(identifier, locationLabel);

            expect(result.spot).toBeDefined();
            expect(result.spot.identifier).toBe(identifier);
            expect(result.spot.location_label).toBe(locationLabel);
            expect(result.spot.is_active).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    }, 60000);
  });

  /**
   * Property 19: Duplicate resource identifiers are rejected
   *
   * For any identifier already in use, creation SHALL be rejected with 409.
   *
   * **Validates: Requirements 8.8**
   */
  describe('Property 19: Duplicate resource identifiers are rejected', () => {
    it('should reject desk creation with duplicate identifier (409)', async () => {
      await fc.assert(
        fc.asyncProperty(
          identifierArb,
          floorArb,
          async (identifier, floor) => {
            // Mock DB throwing unique violation (code 23505)
            const pgError: any = new Error(
              'duplicate key value violates unique constraint "desks_identifier_key"'
            );
            pgError.code = '23505';

            (mockPool.query as jest.Mock).mockRejectedValueOnce(pgError);

            try {
              await resourceService.addDesk(identifier, floor);
              fail('Expected error to be thrown');
            } catch (err: any) {
              expect(err.statusCode).toBe(409);
              expect(err.message).toContain('Identifier already in use');
            }
          }
        ),
        { numRuns: 100 }
      );
    }, 60000);

    it('should reject parking spot creation with duplicate identifier (409)', async () => {
      await fc.assert(
        fc.asyncProperty(
          identifierArb,
          locationLabelArb,
          async (identifier, locationLabel) => {
            // Mock DB throwing unique violation (code 23505)
            const pgError: any = new Error(
              'duplicate key value violates unique constraint "parking_spots_identifier_key"'
            );
            pgError.code = '23505';

            (mockPool.query as jest.Mock).mockRejectedValueOnce(pgError);

            try {
              await resourceService.addParkingSpot(identifier, locationLabel);
              fail('Expected error to be thrown');
            } catch (err: any) {
              expect(err.statusCode).toBe(409);
              expect(err.message).toContain('Identifier already in use');
            }
          }
        ),
        { numRuns: 100 }
      );
    }, 60000);
  });

  /**
   * Property 20: Resources with active bookings cannot be removed
   *
   * For any resource with booking_date >= today, removal SHALL be rejected with 409.
   *
   * **Validates: Requirements 8.3**
   */
  describe('Property 20: Resources with active bookings cannot be removed', () => {
    it('should reject desk deactivation when active bookings exist (409)', async () => {
      await fc.assert(
        fc.asyncProperty(
          positiveIntArb, // deskId
          fc.integer({ min: 0, max: 60 }), // days from today for booking
          async (deskId, daysOffset) => {
            // Desk exists and is active
            (mockPool.query as jest.Mock)
              .mockResolvedValueOnce({ rows: [{ id: deskId }] })
              // Active bookings found
              .mockResolvedValueOnce({ rows: [{ id: 1 }] });

            try {
              await resourceService.deactivateDesk(deskId);
              fail('Expected error to be thrown');
            } catch (err: any) {
              expect(err.statusCode).toBe(409);
              expect(err.message).toContain('active bookings');
            }
          }
        ),
        { numRuns: 100 }
      );
    }, 60000);

    it('should reject parking spot deactivation when active bookings exist (409)', async () => {
      await fc.assert(
        fc.asyncProperty(
          positiveIntArb, // spotId
          fc.integer({ min: 0, max: 60 }), // days from today for booking
          async (spotId, daysOffset) => {
            // Spot exists and is active
            (mockPool.query as jest.Mock)
              .mockResolvedValueOnce({ rows: [{ id: spotId }] })
              // Active bookings found
              .mockResolvedValueOnce({ rows: [{ id: 1 }] });

            try {
              await resourceService.deactivateParkingSpot(spotId);
              fail('Expected error to be thrown');
            } catch (err: any) {
              expect(err.statusCode).toBe(409);
              expect(err.message).toContain('active bookings');
            }
          }
        ),
        { numRuns: 100 }
      );
    }, 60000);
  });

  /**
   * Property 21: Non-admin users cannot perform admin operations
   *
   * For any user with role='user', admin requests SHALL be rejected with 403.
   *
   * **Validates: Requirements 8.5, 9.3**
   */
  describe('Property 21: Non-admin users cannot perform admin operations', () => {
    it('should reject non-admin users with 403 on all admin endpoints', async () => {
      // Create a minimal test app with the adminGuard middleware
      const testApp = express();
      testApp.use(express.json());

      // Simulate authGuard attaching user to req
      testApp.use((req: Request, _res: Response, next: NextFunction) => {
        // user will be set per test via header
        const role = req.headers['x-test-role'] as string || 'user';
        req.user = {
          id: 1,
          email: 'test@example.com',
          name: 'Test User',
          role,
        };
        next();
      });

      // Apply adminGuard then a dummy handler
      testApp.post('/admin/desks', adminGuard, (_req, res) => res.status(201).json({ ok: true }));
      testApp.put('/admin/desks/:id', adminGuard, (_req, res) => res.status(200).json({ ok: true }));
      testApp.delete('/admin/desks/:id', adminGuard, (_req, res) => res.status(200).json({ ok: true }));
      testApp.post('/admin/parking', adminGuard, (_req, res) => res.status(201).json({ ok: true }));
      testApp.put('/admin/parking/:id', adminGuard, (_req, res) => res.status(200).json({ ok: true }));
      testApp.delete('/admin/parking/:id', adminGuard, (_req, res) => res.status(200).json({ ok: true }));
      testApp.get('/admin/bookings', adminGuard, (_req, res) => res.status(200).json({ ok: true }));

      const endpoints = [
        { method: 'post' as const, path: '/admin/desks', body: { identifier: 'D1', floor: 1 } },
        { method: 'put' as const, path: '/admin/desks/1', body: { identifier: 'D2', floor: 2 } },
        { method: 'delete' as const, path: '/admin/desks/1', body: {} },
        { method: 'post' as const, path: '/admin/parking', body: { identifier: 'P1', locationLabel: 'Level A' } },
        { method: 'put' as const, path: '/admin/parking/1', body: { identifier: 'P2', locationLabel: 'Level B' } },
        { method: 'delete' as const, path: '/admin/parking/1', body: {} },
        { method: 'get' as const, path: '/admin/bookings', body: {} },
      ];

      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 0, max: endpoints.length - 1 }), // endpoint index
          fc.constantFrom('user', 'viewer', 'editor', 'member', 'guest'), // non-admin roles
          async (endpointIdx, role) => {
            const endpoint = endpoints[endpointIdx];
            let res: request.Response;

            if (endpoint.method === 'get') {
              res = await request(testApp)
                .get(endpoint.path)
                .set('x-test-role', role);
            } else if (endpoint.method === 'post') {
              res = await request(testApp)
                .post(endpoint.path)
                .set('x-test-role', role)
                .send(endpoint.body);
            } else if (endpoint.method === 'put') {
              res = await request(testApp)
                .put(endpoint.path)
                .set('x-test-role', role)
                .send(endpoint.body);
            } else {
              res = await request(testApp)
                .delete(endpoint.path)
                .set('x-test-role', role);
            }

            expect(res.status).toBe(403);
            expect(res.body.error).toBeDefined();
          }
        ),
        { numRuns: 100 }
      );
    }, 60000);

    it('should allow admin users through the guard', async () => {
      const testApp = express();
      testApp.use(express.json());

      testApp.use((req: Request, _res: Response, next: NextFunction) => {
        req.user = {
          id: 1,
          email: 'admin@example.com',
          name: 'Admin User',
          role: 'admin',
        };
        next();
      });

      testApp.get('/admin/bookings', adminGuard, (_req, res) => res.status(200).json({ ok: true }));

      const res = await request(testApp).get('/admin/bookings');
      expect(res.status).toBe(200);
    });
  });

  /**
   * Property 22: Admin booking overview filtering returns correct subset
   *
   * For any date range (≤90 days) and optional resource_type filter, overview returns
   * matching bookings sorted ascending, max 500.
   *
   * **Validates: Requirements 9.1, 9.2, 9.4**
   */
  describe('Property 22: Admin booking overview filtering returns correct subset', () => {
    it('should return bookings sorted by date ascending and limited to 500', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 90 }), // date range in days
          fc.option(fc.constantFrom('desk' as const, 'parking_spot' as const)), // optional resourceType
          fc.integer({ min: 0, max: 500 }), // number of bookings returned by DB
          async (rangeDays, resourceType, numBookings) => {
            const startDate = '2025-06-15';
            const endDateObj = new Date('2025-06-15');
            endDateObj.setDate(endDateObj.getDate() + rangeDays);
            const endDate = endDateObj.toISOString().split('T')[0];

            // Generate mock booking rows sorted ascending
            const mockRows = Array.from({ length: Math.min(numBookings, 500) }, (_, i) => {
              const bookingDateObj = new Date('2025-06-15');
              bookingDateObj.setDate(bookingDateObj.getDate() + (i % rangeDays));
              return {
                id: i + 1,
                user_name: `User ${i}`,
                resource_type: resourceType ?? (i % 2 === 0 ? 'desk' : 'parking_spot'),
                resource_identifier: `R-${i}`,
                booking_date: bookingDateObj.toISOString().split('T')[0],
              };
            }).sort((a, b) => a.booking_date.localeCompare(b.booking_date));

            (mockPool.query as jest.Mock).mockResolvedValueOnce({
              rows: mockRows,
            });

            const filters: any = { startDate, endDate };
            if (resourceType) {
              filters.resourceType = resourceType;
            }

            const result = await getBookingOverview(filters);

            // Verify max 500 records
            expect(result.bookings.length).toBeLessThanOrEqual(500);

            // Verify sorted ascending by booking_date
            for (let i = 1; i < result.bookings.length; i++) {
              expect(result.bookings[i].booking_date >= result.bookings[i - 1].booking_date).toBe(true);
            }

            // Verify total matches bookings length
            expect(result.total).toBe(result.bookings.length);
          }
        ),
        { numRuns: 100 }
      );
    }, 60000);

    it('should reject date ranges exceeding 90 days', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 91, max: 365 }), // date range > 90 days
          async (rangeDays) => {
            const startDate = '2025-06-15';
            const endDateObj = new Date('2025-06-15');
            endDateObj.setDate(endDateObj.getDate() + rangeDays);
            const endDate = endDateObj.toISOString().split('T')[0];

            try {
              await getBookingOverview({ startDate, endDate });
              fail('Expected error to be thrown');
            } catch (err: any) {
              expect(err.statusCode).toBe(400);
              expect(err.message).toContain('90 days');
            }
          }
        ),
        { numRuns: 100 }
      );
    }, 60000);

    it('should default to today + 30 days when no date range provided', async () => {
      const mockRows: any[] = [];
      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: mockRows });

      const result = await getBookingOverview({});

      expect(result.bookings).toEqual([]);
      expect(result.total).toBe(0);

      // Verify the query was called with the correct date range
      const queryCall = (mockPool.query as jest.Mock).mock.calls[0];
      expect(queryCall[1][0]).toBe('2025-06-15'); // startDate = today
      expect(queryCall[1][1]).toBe('2025-07-15'); // endDate = today + 30
    });
  });
});
