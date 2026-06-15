import fc from 'fast-check';
import pool from '../../db/pool';
import * as bookingService from '../../services/bookingService';

// Mock the database pool
jest.mock('../../db/pool', () => ({
  query: jest.fn(),
}));

const mockPool = pool as jest.Mocked<typeof pool>;

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Formats a Date to YYYY-MM-DD string (local time).
 */
function toDateString(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// ─── Arbitraries ────────────────────────────────────────────────────────────

/**
 * Generates a positive integer user ID.
 */
const userIdArb = fc.integer({ min: 1, max: 100000 });

/**
 * Generates a positive integer resource ID (desk or parking spot).
 */
const resourceIdArb = fc.integer({ min: 1, max: 10000 });

/**
 * Generates a positive integer booking ID.
 */
const bookingIdArb = fc.integer({ min: 1, max: 100000 });

/**
 * Generates a valid future date offset (0 to 30 days from "today").
 * The actual Date is computed relative to faked system time.
 */
const futureDaysOffsetArb = fc.integer({ min: 0, max: 30 });

/**
 * Generates a past date offset (1 to 365 days before "today").
 * The actual Date is computed relative to faked system time.
 */
const pastDaysOffsetArb = fc.integer({ min: 1, max: 365 });

/**
 * Generates two distinct user IDs (userA ≠ userB).
 */
const distinctUserPairArb = fc
  .tuple(userIdArb, userIdArb)
  .filter(([a, b]) => a !== b);

// ─── Property Tests ─────────────────────────────────────────────────────────

describe('Booking Cancellation Property Tests', () => {
  // Use fake timers for deterministic date testing
  const FIXED_NOW = new Date('2025-06-15T12:00:00.000Z');

  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(FIXED_NOW);
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Property 13: Booking then cancellation round-trip frees resource
   *
   * For any user U, resource R, and valid date D: if U books R on D (success),
   * then U cancels that booking (success), then another user booking R on D
   * SHALL succeed — proving the resource was freed.
   *
   * **Validates: Requirements 5.1, 5.4**
   */
  describe('Property 13: Booking then cancellation round-trip frees resource', () => {
    it('booking, then cancellation, then re-booking by another user succeeds', async () => {
      await fc.assert(
        fc.asyncProperty(
          distinctUserPairArb,
          resourceIdArb,
          futureDaysOffsetArb,
          bookingIdArb,
          async ([userA, userB], deskId, daysAhead, bookingId) => {
            // Compute the future date relative to faked now
            const date = new Date(FIXED_NOW);
            date.setDate(date.getDate() + daysAhead);
            date.setHours(0, 0, 0, 0);
            const dateStr = toDateString(date);

            jest.clearAllMocks();

            // --- Step 1: User A books desk on date (success) ---
            (mockPool.query as jest.Mock)
              // Mock desk lookup: desk exists and is active
              .mockResolvedValueOnce({
                rows: [{ id: deskId, identifier: `DESK-${deskId}`, is_active: true }],
              })
              // Mock INSERT returning the new booking
              .mockResolvedValueOnce({
                rows: [{
                  id: bookingId,
                  user_id: userA,
                  resource_type: 'desk',
                  resource_id: deskId,
                  booking_date: dateStr,
                  created_at: new Date(),
                  updated_at: new Date(),
                }],
              });

            const bookResult = await bookingService.createDeskBooking(userA, deskId, date);
            expect(bookResult.booking).toBeDefined();
            expect(bookResult.booking.id).toBe(bookingId);

            jest.clearAllMocks();

            // --- Step 2: User A cancels the booking (success) ---
            (mockPool.query as jest.Mock)
              // Mock SELECT booking: owned by userA, future date
              .mockResolvedValueOnce({
                rows: [{
                  id: bookingId,
                  user_id: userA,
                  booking_date: dateStr,
                }],
              })
              // Mock DELETE: success
              .mockResolvedValueOnce({ rows: [], rowCount: 1 });

            await bookingService.cancelBooking(userA, bookingId);

            jest.clearAllMocks();

            // --- Step 3: Another user books the same desk on same date (succeeds) ---
            const newBookingId = bookingId + 1;
            (mockPool.query as jest.Mock)
              .mockResolvedValueOnce({
                rows: [{ id: deskId, identifier: `DESK-${deskId}`, is_active: true }],
              })
              .mockResolvedValueOnce({
                rows: [{
                  id: newBookingId,
                  user_id: userB,
                  resource_type: 'desk',
                  resource_id: deskId,
                  booking_date: dateStr,
                  created_at: new Date(),
                  updated_at: new Date(),
                }],
              });

            const rebookResult = await bookingService.createDeskBooking(userB, deskId, date);
            expect(rebookResult.booking).toBeDefined();
            expect(rebookResult.booking.user_id).toBe(userB);
            expect(rebookResult.booking.resource_id).toBe(deskId);
          }
        ),
        { numRuns: 100 }
      );
    }, 60000);
  });

  /**
   * Property 14: Users cannot cancel other users' bookings
   *
   * For any booking owned by user A, a cancellation request from user B (A ≠ B)
   * SHALL be rejected with an authorization error (403).
   *
   * **Validates: Requirements 5.2**
   */
  describe("Property 14: Users cannot cancel other users' bookings", () => {
    it('should reject cancellation with 403 when user does not own the booking', async () => {
      await fc.assert(
        fc.asyncProperty(
          distinctUserPairArb,
          bookingIdArb,
          futureDaysOffsetArb,
          async ([userA, userB], bookingId, daysAhead) => {
            const date = new Date(FIXED_NOW);
            date.setDate(date.getDate() + daysAhead);
            date.setHours(0, 0, 0, 0);
            const dateStr = toDateString(date);

            jest.clearAllMocks();

            // Mock SELECT booking: owned by userA
            (mockPool.query as jest.Mock).mockResolvedValueOnce({
              rows: [{
                id: bookingId,
                user_id: userA,
                booking_date: dateStr,
              }],
            });

            // userB attempts to cancel userA's booking → 403
            await expect(
              bookingService.cancelBooking(userB, bookingId)
            ).rejects.toMatchObject({
              message: 'Access denied',
              statusCode: 403,
            });

            // Verify DELETE was never called (only the SELECT was executed)
            expect(mockPool.query).toHaveBeenCalledTimes(1);
          }
        ),
        { numRuns: 100 }
      );
    }, 60000);
  });

  /**
   * Property 15: Past bookings cannot be cancelled
   *
   * For any booking with a booking_date earlier than the current date,
   * a cancellation request SHALL be rejected with an error.
   *
   * **Validates: Requirements 5.3**
   */
  describe('Property 15: Past bookings cannot be cancelled', () => {
    it('should reject cancellation with 400 for bookings with past dates', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdArb,
          bookingIdArb,
          pastDaysOffsetArb,
          async (userId, bookingId, daysAgo) => {
            // Compute past date relative to faked now
            const pastDate = new Date(FIXED_NOW);
            pastDate.setDate(pastDate.getDate() - daysAgo);
            pastDate.setHours(0, 0, 0, 0);
            const dateStr = toDateString(pastDate);

            jest.clearAllMocks();

            // Mock SELECT booking: owned by user, past date
            (mockPool.query as jest.Mock).mockResolvedValueOnce({
              rows: [{
                id: bookingId,
                user_id: userId,
                booking_date: dateStr,
              }],
            });

            await expect(
              bookingService.cancelBooking(userId, bookingId)
            ).rejects.toMatchObject({
              message: 'Cannot cancel past bookings',
              statusCode: 400,
            });

            // Verify DELETE was never called
            expect(mockPool.query).toHaveBeenCalledTimes(1);
          }
        ),
        { numRuns: 100 }
      );
    }, 60000);
  });
});
