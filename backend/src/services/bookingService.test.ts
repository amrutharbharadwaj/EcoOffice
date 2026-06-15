import * as bookingService from './bookingService';
import pool from '../db/pool';

// Mock the database pool
jest.mock('../db/pool', () => ({
  query: jest.fn(),
}));

const mockPool = pool as jest.Mocked<typeof pool>;

describe('bookingService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-06-15T10:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('createDeskBooking', () => {
    const validDate = new Date('2024-06-20');
    const userId = 1;
    const deskId = 5;

    it('should create a desk booking when desk exists, is active, and date is valid', async () => {
      const mockBooking = {
        id: 1,
        user_id: userId,
        resource_type: 'desk',
        resource_id: deskId,
        booking_date: '2024-06-20',
        created_at: new Date(),
        updated_at: new Date(),
      };

      // Mock desk lookup
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ id: deskId, identifier: 'D-101', is_active: true }] })
        // Mock booking insert
        .mockResolvedValueOnce({ rows: [mockBooking] });

      const result = await bookingService.createDeskBooking(userId, deskId, validDate);

      expect(result.booking).toEqual(mockBooking);
      expect(mockPool.query).toHaveBeenCalledTimes(2);
    });

    it('should throw 404 when desk does not exist', async () => {
      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      await expect(
        bookingService.createDeskBooking(userId, 999, validDate)
      ).rejects.toMatchObject({
        message: 'Desk not found',
        statusCode: 404,
      });
    });

    it('should throw 404 when desk is inactive', async () => {
      (mockPool.query as jest.Mock).mockResolvedValueOnce({
        rows: [{ id: deskId, identifier: 'D-101', is_active: false }],
      });

      await expect(
        bookingService.createDeskBooking(userId, deskId, validDate)
      ).rejects.toMatchObject({
        message: 'Desk not found',
        statusCode: 404,
      });
    });

    it('should throw 400 when booking date is in the past', async () => {
      const pastDate = new Date('2024-06-10');

      await expect(
        bookingService.createDeskBooking(userId, deskId, pastDate)
      ).rejects.toMatchObject({
        message: 'Booking date cannot be in the past',
        statusCode: 400,
      });
    });

    it('should throw 400 when booking date is more than 30 days in the future', async () => {
      const farFutureDate = new Date('2024-07-20');

      await expect(
        bookingService.createDeskBooking(userId, deskId, farFutureDate)
      ).rejects.toMatchObject({
        message: 'Booking date cannot be more than 30 days in the future',
        statusCode: 400,
      });
    });

    it('should throw 409 when desk is already booked (unique_violation)', async () => {
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ id: deskId, identifier: 'D-101', is_active: true }] })
        .mockRejectedValueOnce({ code: '23505' });

      await expect(
        bookingService.createDeskBooking(userId, deskId, validDate)
      ).rejects.toMatchObject({
        message: 'Desk is already booked for this date',
        statusCode: 409,
      });
    });

    it('should rethrow non-unique-violation database errors', async () => {
      const dbError = new Error('Connection failed');

      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ id: deskId, identifier: 'D-101', is_active: true }] })
        .mockRejectedValueOnce(dbError);

      await expect(
        bookingService.createDeskBooking(userId, deskId, validDate)
      ).rejects.toThrow('Connection failed');
    });

    it('should allow booking on today', async () => {
      const today = new Date('2024-06-15');
      const mockBooking = {
        id: 1,
        user_id: userId,
        resource_type: 'desk',
        resource_id: deskId,
        booking_date: '2024-06-15',
        created_at: new Date(),
        updated_at: new Date(),
      };

      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ id: deskId, identifier: 'D-101', is_active: true }] })
        .mockResolvedValueOnce({ rows: [mockBooking] });

      const result = await bookingService.createDeskBooking(userId, deskId, today);
      expect(result.booking).toEqual(mockBooking);
    });

    it('should allow booking exactly 30 days in the future', async () => {
      const maxDate = new Date('2024-07-15');
      const mockBooking = {
        id: 1,
        user_id: userId,
        resource_type: 'desk',
        resource_id: deskId,
        booking_date: '2024-07-15',
        created_at: new Date(),
        updated_at: new Date(),
      };

      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ id: deskId, identifier: 'D-101', is_active: true }] })
        .mockResolvedValueOnce({ rows: [mockBooking] });

      const result = await bookingService.createDeskBooking(userId, deskId, maxDate);
      expect(result.booking).toEqual(mockBooking);
    });
  });

  describe('createParkingBooking', () => {
    const validDate = new Date('2024-06-20');
    const userId = 1;
    const spotId = 3;

    it('should create a parking booking when spot exists, is active, and date is valid', async () => {
      const mockBooking = {
        id: 2,
        user_id: userId,
        resource_type: 'parking_spot',
        resource_id: spotId,
        booking_date: '2024-06-20',
        created_at: new Date(),
        updated_at: new Date(),
      };

      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ id: spotId, identifier: 'P-A1', is_active: true }] })
        .mockResolvedValueOnce({ rows: [mockBooking] });

      const result = await bookingService.createParkingBooking(userId, spotId, validDate);

      expect(result.booking).toEqual(mockBooking);
      expect(mockPool.query).toHaveBeenCalledTimes(2);
    });

    it('should throw 404 when parking spot does not exist', async () => {
      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      await expect(
        bookingService.createParkingBooking(userId, 999, validDate)
      ).rejects.toMatchObject({
        message: 'Parking spot not found',
        statusCode: 404,
      });
    });

    it('should throw 404 when parking spot is inactive', async () => {
      (mockPool.query as jest.Mock).mockResolvedValueOnce({
        rows: [{ id: spotId, identifier: 'P-A1', is_active: false }],
      });

      await expect(
        bookingService.createParkingBooking(userId, spotId, validDate)
      ).rejects.toMatchObject({
        message: 'Parking spot not found',
        statusCode: 404,
      });
    });

    it('should throw 400 when booking date is in the past', async () => {
      const pastDate = new Date('2024-06-10');

      await expect(
        bookingService.createParkingBooking(userId, spotId, pastDate)
      ).rejects.toMatchObject({
        message: 'Booking date cannot be in the past',
        statusCode: 400,
      });
    });

    it('should throw 400 when booking date exceeds 30-day window', async () => {
      const farFutureDate = new Date('2024-07-20');

      await expect(
        bookingService.createParkingBooking(userId, spotId, farFutureDate)
      ).rejects.toMatchObject({
        message: 'Booking date cannot be more than 30 days in the future',
        statusCode: 400,
      });
    });

    it('should throw 409 when parking spot is already booked (unique_violation)', async () => {
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ id: spotId, identifier: 'P-A1', is_active: true }] })
        .mockRejectedValueOnce({ code: '23505' });

      await expect(
        bookingService.createParkingBooking(userId, spotId, validDate)
      ).rejects.toMatchObject({
        message: 'Parking spot is already booked for this date',
        statusCode: 409,
      });
    });
  });

  describe('cancelBooking', () => {
    const userId = 1;

    it('should cancel a booking owned by the user with a future date', async () => {
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({
          rows: [{ id: 10, user_id: userId, booking_date: '2024-06-20' }],
        })
        .mockResolvedValueOnce({ rows: [] });

      await expect(
        bookingService.cancelBooking(userId, 10)
      ).resolves.toBeUndefined();

      // Verify DELETE was called
      const deleteCall = (mockPool.query as jest.Mock).mock.calls[1];
      expect(deleteCall[0]).toContain('DELETE FROM bookings');
      expect(deleteCall[1]).toEqual([10]);
    });

    it('should throw 404 when booking does not exist', async () => {
      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      await expect(
        bookingService.cancelBooking(userId, 999)
      ).rejects.toMatchObject({
        message: 'Booking not found',
        statusCode: 404,
      });
    });

    it('should throw 403 when user does not own the booking', async () => {
      (mockPool.query as jest.Mock).mockResolvedValueOnce({
        rows: [{ id: 10, user_id: 2, booking_date: '2024-06-20' }],
      });

      await expect(
        bookingService.cancelBooking(userId, 10)
      ).rejects.toMatchObject({
        message: 'Access denied',
        statusCode: 403,
      });
    });

    it('should throw 400 when booking date is in the past', async () => {
      (mockPool.query as jest.Mock).mockResolvedValueOnce({
        rows: [{ id: 10, user_id: userId, booking_date: '2024-06-10' }],
      });

      await expect(
        bookingService.cancelBooking(userId, 10)
      ).rejects.toMatchObject({
        message: 'Cannot cancel past bookings',
        statusCode: 400,
      });
    });

    it('should allow cancelling a booking for today', async () => {
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({
          rows: [{ id: 10, user_id: userId, booking_date: '2024-06-15' }],
        })
        .mockResolvedValueOnce({ rows: [] });

      await expect(
        bookingService.cancelBooking(userId, 10)
      ).resolves.toBeUndefined();
    });
  });

  describe('getUserBookings', () => {
    const userId = 1;

    it('should return upcoming bookings sorted by date ascending', async () => {
      const mockBookings = [
        {
          id: 1,
          user_id: userId,
          resource_type: 'desk',
          resource_id: 5,
          booking_date: '2024-06-18',
          created_at: new Date(),
          updated_at: new Date(),
          resource_identifier: 'D-101',
        },
        {
          id: 2,
          user_id: userId,
          resource_type: 'parking_spot',
          resource_id: 3,
          booking_date: '2024-06-20',
          created_at: new Date(),
          updated_at: new Date(),
          resource_identifier: 'P-A1',
        },
      ];

      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: mockBookings });

      const result = await bookingService.getUserBookings(userId);

      expect(result).toEqual(mockBookings);
      expect(result).toHaveLength(2);

      // Verify query filters by user and date
      const callArgs = (mockPool.query as jest.Mock).mock.calls[0];
      expect(callArgs[0]).toContain('booking_date >= $2');
      expect(callArgs[1][0]).toBe(userId);
    });

    it('should return empty array when no upcoming bookings exist', async () => {
      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      const result = await bookingService.getUserBookings(userId);

      expect(result).toEqual([]);
    });

    it('should include resource_identifier via JOIN', async () => {
      const mockBookings = [
        {
          id: 1,
          user_id: userId,
          resource_type: 'desk',
          resource_id: 5,
          booking_date: '2024-06-18',
          created_at: new Date(),
          updated_at: new Date(),
          resource_identifier: 'D-101',
        },
      ];

      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: mockBookings });

      const result = await bookingService.getUserBookings(userId);

      expect(result[0].resource_identifier).toBe('D-101');

      // Verify query has JOIN
      const callArgs = (mockPool.query as jest.Mock).mock.calls[0];
      expect(callArgs[0]).toContain('LEFT JOIN desks');
      expect(callArgs[0]).toContain('LEFT JOIN parking_spots');
    });
  });
});
