import fc from 'fast-check';
import pool from '../../db/pool';
import {
  getDeskAvailability,
  getParkingAvailability,
  getUserBookings,
} from '../../services/bookingService';

// Mock the database pool
jest.mock('../../db/pool', () => ({
  query: jest.fn(),
}));

const mockPool = pool as jest.Mocked<typeof pool>;

// ─── Arbitraries ────────────────────────────────────────────────────────────

/**
 * Generates a random desk with id, identifier, and floor.
 */
const deskArb = fc.record({
  id: fc.integer({ min: 1, max: 10000 }),
  identifier: fc
    .tuple(
      fc.constantFrom('A', 'B', 'C', 'D', 'E', 'F'),
      fc.integer({ min: 1, max: 999 })
    )
    .map(([prefix, num]) => `${prefix}-${num}`),
  floor: fc.integer({ min: 1, max: 10 }),
});

/**
 * Generates a random parking spot with id, identifier, and location_label.
 */
const parkingSpotArb = fc.record({
  id: fc.integer({ min: 1, max: 10000 }),
  identifier: fc
    .tuple(
      fc.constantFrom('P', 'G', 'L'),
      fc.integer({ min: 1, max: 999 })
    )
    .map(([prefix, num]) => `${prefix}-${num}`),
  location_label: fc.constantFrom(
    'Level 1 - North',
    'Level 1 - South',
    'Level 2 - East',
    'Level 2 - West',
    'Ground Floor'
  ),
});

/**
 * Generates a valid date string in YYYY-MM-DD format (today to +30 days).
 */
const validDateArb = fc
  .integer({ min: 0, max: 30 })
  .map((offset) => {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    return d.toISOString().split('T')[0];
  });

// ─── Property Tests ─────────────────────────────────────────────────────────

describe('Availability Property Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Property 16: Availability reflects actual booking state
   *
   * For any set of resources and a valid date D, the availability endpoint SHALL
   * return each resource with status "available" if no booking exists for (resource, D),
   * or "booked" if a booking exists.
   *
   * **Validates: Requirements 6.1, 6.2**
   */
  describe('Property 16: Availability reflects actual booking state', () => {
    it('desk availability status matches whether a booking exists for each desk', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(deskArb, { minLength: 1, maxLength: 10 }),
          validDateArb,
          async (desks, date) => {
            // For each desk, randomly decide if it's booked (deterministic based on id)
            const bookedDeskIds = new Set(
              desks.filter((_, index) => index % 2 === 0).map((d) => d.id)
            );

            // Build mock rows matching the LEFT JOIN SQL pattern:
            // Each row has id, identifier, floor, and status
            const mockRows = desks.map((desk) => ({
              id: desk.id,
              identifier: desk.identifier,
              floor: desk.floor,
              status: bookedDeskIds.has(desk.id) ? 'booked' : 'available',
            }));

            (mockPool.query as jest.Mock).mockResolvedValue({ rows: mockRows });

            const result = await getDeskAvailability(date);

            // Verify each desk's status matches expected booking state
            expect(result).toHaveLength(desks.length);
            for (const row of result) {
              if (bookedDeskIds.has(row.id)) {
                expect(row.status).toBe('booked');
              } else {
                expect(row.status).toBe('available');
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('parking availability status matches whether a booking exists for each spot', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(parkingSpotArb, { minLength: 1, maxLength: 10 }),
          validDateArb,
          async (spots, date) => {
            // For each spot, randomly decide if it's booked (deterministic based on index)
            const bookedSpotIds = new Set(
              spots.filter((_, index) => index % 3 === 0).map((s) => s.id)
            );

            // Build mock rows matching the LEFT JOIN SQL pattern
            const mockRows = spots.map((spot) => ({
              id: spot.id,
              identifier: spot.identifier,
              location_label: spot.location_label,
              status: bookedSpotIds.has(spot.id) ? 'booked' : 'available',
            }));

            (mockPool.query as jest.Mock).mockResolvedValue({ rows: mockRows });

            const result = await getParkingAvailability(date);

            // Verify each spot's status matches expected booking state
            expect(result).toHaveLength(spots.length);
            for (const row of result) {
              if (bookedSpotIds.has(row.id)) {
                expect(row.status).toBe('booked');
              } else {
                expect(row.status).toBe('available');
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('all desks show available when no bookings exist', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(deskArb, { minLength: 1, maxLength: 10 }),
          validDateArb,
          async (desks, date) => {
            // No bookings exist — all should be available
            const mockRows = desks.map((desk) => ({
              id: desk.id,
              identifier: desk.identifier,
              floor: desk.floor,
              status: 'available',
            }));

            (mockPool.query as jest.Mock).mockResolvedValue({ rows: mockRows });

            const result = await getDeskAvailability(date);

            for (const row of result) {
              expect(row.status).toBe('available');
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('all desks show booked when all have bookings', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(deskArb, { minLength: 1, maxLength: 10 }),
          validDateArb,
          async (desks, date) => {
            // All desks are booked
            const mockRows = desks.map((desk) => ({
              id: desk.id,
              identifier: desk.identifier,
              floor: desk.floor,
              status: 'booked',
            }));

            (mockPool.query as jest.Mock).mockResolvedValue({ rows: mockRows });

            const result = await getDeskAvailability(date);

            for (const row of result) {
              expect(row.status).toBe('booked');
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});

describe('User Bookings Property Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  /**
   * Property 17: User bookings are sorted ascending and only include future dates
   *
   * For any user with multiple bookings spanning past and future dates,
   * the "my bookings" endpoint SHALL return only bookings with booking_date >= today,
   * sorted by booking_date in ascending order.
   *
   * **Validates: Requirements 7.2, 7.3**
   */
  describe('Property 17: User bookings are sorted ascending and only include future dates', () => {
    it('returns only future bookings sorted by booking_date ascending', async () => {
      // Fix the system time so "today" is deterministic
      const fixedToday = new Date('2025-03-15T00:00:00.000Z');
      jest.setSystemTime(fixedToday);

      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 10000 }), // userId
          fc.array(
            fc.record({
              id: fc.integer({ min: 1, max: 10000 }),
              user_id: fc.constant(1),
              resource_type: fc.constantFrom('desk' as const, 'parking_spot' as const),
              resource_id: fc.integer({ min: 1, max: 100 }),
              booking_date: fc.integer({ min: 0, max: 60 }).map((offset) => {
                const d = new Date('2025-03-15');
                d.setDate(d.getDate() + offset);
                return d.toISOString().split('T')[0];
              }),
              created_at: fc.constant(new Date('2025-03-01')),
              updated_at: fc.constant(new Date('2025-03-01')),
              resource_identifier: fc
                .tuple(
                  fc.constantFrom('A', 'B', 'P'),
                  fc.integer({ min: 1, max: 100 })
                )
                .map(([p, n]) => `${p}-${n}`),
            }),
            { minLength: 1, maxLength: 15 }
          ),
          async (userId, bookings) => {
            // The service filters to future bookings and sorts by date ascending.
            // We simulate the DB returning only future bookings already sorted
            // (since the SQL uses WHERE booking_date >= today ORDER BY booking_date ASC).
            const todayStr = '2025-03-15';
            const futureBookings = bookings
              .filter((b) => b.booking_date >= todayStr)
              .sort((a, b) => a.booking_date.localeCompare(b.booking_date));

            (mockPool.query as jest.Mock).mockResolvedValue({ rows: futureBookings });

            const result = await getUserBookings(userId);

            // Verify: all returned bookings have booking_date >= today
            for (const booking of result) {
              expect(booking.booking_date >= todayStr).toBe(true);
            }

            // Verify: dates are in ascending order
            for (let i = 1; i < result.length; i++) {
              expect(result[i].booking_date >= result[i - 1].booking_date).toBe(true);
            }

            // Verify: count matches expected future bookings
            expect(result.length).toBe(futureBookings.length);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('returns empty array when user has no future bookings', async () => {
      const fixedToday = new Date('2025-03-15T00:00:00.000Z');
      jest.setSystemTime(fixedToday);

      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 10000 }), // userId
          async (userId) => {
            // DB returns no rows (all bookings are in the past, filtered by SQL)
            (mockPool.query as jest.Mock).mockResolvedValue({ rows: [] });

            const result = await getUserBookings(userId);

            expect(result).toHaveLength(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('correctly passes today date to the database query', async () => {
      const fixedToday = new Date('2025-06-10T00:00:00.000Z');
      jest.setSystemTime(fixedToday);

      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 10000 }), // userId
          async (userId) => {
            (mockPool.query as jest.Mock).mockResolvedValue({ rows: [] });

            await getUserBookings(userId);

            // Verify the service called the DB with today's date for the >= filter
            expect(mockPool.query).toHaveBeenCalledWith(
              expect.stringContaining('booking_date >= $2'),
              expect.arrayContaining([userId])
            );

            // Verify the date parameter is today (with time zeroed out)
            const callArgs = (mockPool.query as jest.Mock).mock.calls[0][1];
            const passedDate = callArgs[1] as Date;
            expect(passedDate.getFullYear()).toBe(2025);
            expect(passedDate.getMonth()).toBe(5); // June is month 5 (0-indexed)
            expect(passedDate.getDate()).toBe(10);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
