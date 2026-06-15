import fc from 'fast-check';
import pool from '../../db/pool';
import {
  createDeskBooking,
  createParkingBooking,
} from '../../services/bookingService';

// Mock the database pool
jest.mock('../../db/pool', () => ({
  query: jest.fn(),
}));

const mockPool = pool as jest.Mocked<typeof pool>;

// ─── Arbitraries ────────────────────────────────────────────────────────────

/** Generates a positive integer for user/resource IDs. */
const positiveIntArb = fc.integer({ min: 1, max: 10000 });

/** Generates a valid desk identifier string. */
const deskIdentifierArb = fc.stringOf(
  fc.constantFrom(...'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-'.split('')),
  { minLength: 1, maxLength: 20 }
);

/** Generates a valid parking spot identifier string. */
const parkingIdentifierArb = fc.stringOf(
  fc.constantFrom(...'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-'.split('')),
  { minLength: 1, maxLength: 20 }
);

// ─── Property Tests ─────────────────────────────────────────────────────────

describe('Booking Constraints Property Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    // Set fixed "now" to 2025-06-15T12:00:00Z for deterministic tests
    jest.setSystemTime(new Date('2025-06-15T12:00:00Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  /**
   * Property 8: No double-booking (desk)
   *
   * For any desk D and date T, if a booking already exists for (D, T), then any
   * subsequent booking attempt for the same (D, T) SHALL be rejected with an
   * unavailability error, and at most one booking SHALL exist for that combination.
   *
   * **Validates: Requirements 3.2, 3.4, 10.1, 10.3**
   */
  describe('Property 8: No double-booking (desk)', () => {
    it('should reject a second booking for the same desk and date with 409', async () => {
      await fc.assert(
        fc.asyncProperty(
          positiveIntArb, // userId for first booking
          positiveIntArb, // userId for second booking
          positiveIntArb, // deskId
          deskIdentifierArb, // desk identifier
          fc.integer({ min: 0, max: 29 }), // days from today (within 30-day window)
          async (userId1, userId2, deskId, identifier, daysOffset) => {
            const bookingDate = new Date('2025-06-15');
            bookingDate.setDate(bookingDate.getDate() + daysOffset);

            // First call: desk lookup returns active desk
            // Second call: INSERT succeeds (first booking)
            (mockPool.query as jest.Mock)
              .mockResolvedValueOnce({
                rows: [{ id: deskId, identifier, is_active: true }],
              })
              .mockResolvedValueOnce({
                rows: [{
                  id: 1,
                  user_id: userId1,
                  resource_type: 'desk',
                  resource_id: deskId,
                  booking_date: bookingDate.toISOString().split('T')[0],
                  created_at: new Date(),
                  updated_at: new Date(),
                }],
              });

            // First booking succeeds
            const result = await createDeskBooking(userId1, deskId, bookingDate);
            expect(result.booking).toBeDefined();

            // Now attempt second booking for same desk+date
            // Desk lookup still returns active desk, but INSERT triggers unique violation
            const pgError: any = new Error(
              'duplicate key value violates unique constraint "unique_resource_booking"'
            );
            pgError.code = '23505';

            (mockPool.query as jest.Mock)
              .mockResolvedValueOnce({
                rows: [{ id: deskId, identifier, is_active: true }],
              })
              .mockRejectedValueOnce(pgError);

            // Second booking should be rejected with 409
            try {
              await createDeskBooking(userId2, deskId, bookingDate);
              fail('Expected error to be thrown');
            } catch (err: any) {
              expect(err.statusCode).toBe(409);
              expect(err.message).toContain('already booked');
            }
          }
        ),
        { numRuns: 100 }
      );
    }, 60000);
  });

  /**
   * Property 9: No double-booking (parking spot)
   *
   * For any parking spot S and date T, if a booking already exists for (S, T), then any
   * subsequent booking attempt for the same (S, T) SHALL be rejected with an
   * unavailability error.
   *
   * **Validates: Requirements 4.2, 4.4, 10.2, 10.3**
   */
  describe('Property 9: No double-booking (parking spot)', () => {
    it('should reject a second booking for the same parking spot and date with 409', async () => {
      await fc.assert(
        fc.asyncProperty(
          positiveIntArb, // userId for first booking
          positiveIntArb, // userId for second booking
          positiveIntArb, // spotId
          parkingIdentifierArb, // spot identifier
          fc.integer({ min: 0, max: 29 }), // days from today (within 30-day window)
          async (userId1, userId2, spotId, identifier, daysOffset) => {
            const bookingDate = new Date('2025-06-15');
            bookingDate.setDate(bookingDate.getDate() + daysOffset);

            // First call: parking spot lookup returns active spot
            // Second call: INSERT succeeds (first booking)
            (mockPool.query as jest.Mock)
              .mockResolvedValueOnce({
                rows: [{ id: spotId, identifier, is_active: true }],
              })
              .mockResolvedValueOnce({
                rows: [{
                  id: 1,
                  user_id: userId1,
                  resource_type: 'parking_spot',
                  resource_id: spotId,
                  booking_date: bookingDate.toISOString().split('T')[0],
                  created_at: new Date(),
                  updated_at: new Date(),
                }],
              });

            // First booking succeeds
            const result = await createParkingBooking(userId1, spotId, bookingDate);
            expect(result.booking).toBeDefined();

            // Now attempt second booking for same spot+date
            const pgError: any = new Error(
              'duplicate key value violates unique constraint "unique_resource_booking"'
            );
            pgError.code = '23505';

            (mockPool.query as jest.Mock)
              .mockResolvedValueOnce({
                rows: [{ id: spotId, identifier, is_active: true }],
              })
              .mockRejectedValueOnce(pgError);

            // Second booking should be rejected with 409
            try {
              await createParkingBooking(userId2, spotId, bookingDate);
              fail('Expected error to be thrown');
            } catch (err: any) {
              expect(err.statusCode).toBe(409);
              expect(err.message).toContain('already booked');
            }
          }
        ),
        { numRuns: 100 }
      );
    }, 60000);
  });

  /**
   * Property 10: Past dates are rejected for booking
   *
   * For any date D where D < current date, and any resource, a booking request SHALL
   * be rejected with a validation error indicating the date is in the past.
   *
   * **Validates: Requirements 3.3, 4.3**
   */
  describe('Property 10: Past dates are rejected for booking', () => {
    it('should reject desk booking with any past date with 400', async () => {
      await fc.assert(
        fc.asyncProperty(
          positiveIntArb, // userId
          positiveIntArb, // deskId
          fc.integer({ min: 1, max: 3650 }), // days in the past (1 to ~10 years)
          async (userId, deskId, daysInPast) => {
            const pastDate = new Date('2025-06-15');
            pastDate.setDate(pastDate.getDate() - daysInPast);

            try {
              await createDeskBooking(userId, deskId, pastDate);
              fail('Expected error to be thrown');
            } catch (err: any) {
              expect(err.statusCode).toBe(400);
              expect(err.message.toLowerCase()).toContain('past');
            }
          }
        ),
        { numRuns: 100 }
      );
    }, 60000);

    it('should reject parking booking with any past date with 400', async () => {
      await fc.assert(
        fc.asyncProperty(
          positiveIntArb, // userId
          positiveIntArb, // spotId
          fc.integer({ min: 1, max: 3650 }), // days in the past (1 to ~10 years)
          async (userId, spotId, daysInPast) => {
            const pastDate = new Date('2025-06-15');
            pastDate.setDate(pastDate.getDate() - daysInPast);

            try {
              await createParkingBooking(userId, spotId, pastDate);
              fail('Expected error to be thrown');
            } catch (err: any) {
              expect(err.statusCode).toBe(400);
              expect(err.message.toLowerCase()).toContain('past');
            }
          }
        ),
        { numRuns: 100 }
      );
    }, 60000);
  });

  /**
   * Property 11: Dates beyond 30-day window are rejected
   *
   * For any date D where D > current date + 30 days, a booking request SHALL be
   * rejected with a validation error indicating the date exceeds the maximum advance
   * booking window.
   *
   * **Validates: Requirements 3.7, 4.7**
   */
  describe('Property 11: Dates beyond 30-day window are rejected', () => {
    it('should reject desk booking with date beyond 30 days from now with 400', async () => {
      await fc.assert(
        fc.asyncProperty(
          positiveIntArb, // userId
          positiveIntArb, // deskId
          fc.integer({ min: 31, max: 3650 }), // days beyond the 30-day window
          async (userId, deskId, daysInFuture) => {
            const futureDate = new Date('2025-06-15');
            futureDate.setDate(futureDate.getDate() + daysInFuture);

            try {
              await createDeskBooking(userId, deskId, futureDate);
              fail('Expected error to be thrown');
            } catch (err: any) {
              expect(err.statusCode).toBe(400);
              expect(err.message.toLowerCase()).toContain('30 days');
            }
          }
        ),
        { numRuns: 100 }
      );
    }, 60000);

    it('should reject parking booking with date beyond 30 days from now with 400', async () => {
      await fc.assert(
        fc.asyncProperty(
          positiveIntArb, // userId
          positiveIntArb, // spotId
          fc.integer({ min: 31, max: 3650 }), // days beyond the 30-day window
          async (userId, spotId, daysInFuture) => {
            const futureDate = new Date('2025-06-15');
            futureDate.setDate(futureDate.getDate() + daysInFuture);

            try {
              await createParkingBooking(userId, spotId, futureDate);
              fail('Expected error to be thrown');
            } catch (err: any) {
              expect(err.statusCode).toBe(400);
              expect(err.message.toLowerCase()).toContain('30 days');
            }
          }
        ),
        { numRuns: 100 }
      );
    }, 60000);
  });

  /**
   * Property 12: Non-existent or inactive resources are rejected
   *
   * For any resource ID that does not exist or has is_active = false, a booking request
   * SHALL be rejected with a not-found error.
   *
   * **Validates: Requirements 3.6, 4.6**
   */
  describe('Property 12: Non-existent or inactive resources are rejected', () => {
    it('should reject desk booking when desk does not exist (404)', async () => {
      await fc.assert(
        fc.asyncProperty(
          positiveIntArb, // userId
          positiveIntArb, // deskId (non-existent)
          fc.integer({ min: 0, max: 29 }), // valid days offset
          async (userId, deskId, daysOffset) => {
            const bookingDate = new Date('2025-06-15');
            bookingDate.setDate(bookingDate.getDate() + daysOffset);

            // Desk lookup returns empty rows (doesn't exist)
            (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

            try {
              await createDeskBooking(userId, deskId, bookingDate);
              fail('Expected error to be thrown');
            } catch (err: any) {
              expect(err.statusCode).toBe(404);
              expect(err.message.toLowerCase()).toContain('not found');
            }
          }
        ),
        { numRuns: 100 }
      );
    }, 60000);

    it('should reject desk booking when desk is inactive (404)', async () => {
      await fc.assert(
        fc.asyncProperty(
          positiveIntArb, // userId
          positiveIntArb, // deskId
          deskIdentifierArb, // identifier
          fc.integer({ min: 0, max: 29 }), // valid days offset
          async (userId, deskId, identifier, daysOffset) => {
            const bookingDate = new Date('2025-06-15');
            bookingDate.setDate(bookingDate.getDate() + daysOffset);

            // Desk lookup returns inactive desk
            (mockPool.query as jest.Mock).mockResolvedValueOnce({
              rows: [{ id: deskId, identifier, is_active: false }],
            });

            try {
              await createDeskBooking(userId, deskId, bookingDate);
              fail('Expected error to be thrown');
            } catch (err: any) {
              expect(err.statusCode).toBe(404);
              expect(err.message.toLowerCase()).toContain('not found');
            }
          }
        ),
        { numRuns: 100 }
      );
    }, 60000);

    it('should reject parking booking when spot does not exist (404)', async () => {
      await fc.assert(
        fc.asyncProperty(
          positiveIntArb, // userId
          positiveIntArb, // spotId (non-existent)
          fc.integer({ min: 0, max: 29 }), // valid days offset
          async (userId, spotId, daysOffset) => {
            const bookingDate = new Date('2025-06-15');
            bookingDate.setDate(bookingDate.getDate() + daysOffset);

            // Parking spot lookup returns empty rows (doesn't exist)
            (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

            try {
              await createParkingBooking(userId, spotId, bookingDate);
              fail('Expected error to be thrown');
            } catch (err: any) {
              expect(err.statusCode).toBe(404);
              expect(err.message.toLowerCase()).toContain('not found');
            }
          }
        ),
        { numRuns: 100 }
      );
    }, 60000);

    it('should reject parking booking when spot is inactive (404)', async () => {
      await fc.assert(
        fc.asyncProperty(
          positiveIntArb, // userId
          positiveIntArb, // spotId
          parkingIdentifierArb, // identifier
          fc.integer({ min: 0, max: 29 }), // valid days offset
          async (userId, spotId, identifier, daysOffset) => {
            const bookingDate = new Date('2025-06-15');
            bookingDate.setDate(bookingDate.getDate() + daysOffset);

            // Parking spot lookup returns inactive spot
            (mockPool.query as jest.Mock).mockResolvedValueOnce({
              rows: [{ id: spotId, identifier, is_active: false }],
            });

            try {
              await createParkingBooking(userId, spotId, bookingDate);
              fail('Expected error to be thrown');
            } catch (err: any) {
              expect(err.statusCode).toBe(404);
              expect(err.message.toLowerCase()).toContain('not found');
            }
          }
        ),
        { numRuns: 100 }
      );
    }, 60000);
  });
});
