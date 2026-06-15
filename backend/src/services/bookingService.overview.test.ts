import * as bookingService from './bookingService';
import pool from '../db/pool';

// Mock the database pool
jest.mock('../db/pool', () => ({
  query: jest.fn(),
}));

const mockPool = pool as jest.Mocked<typeof pool>;

describe('bookingService - getBookingOverview', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-06-15T10:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('default date range', () => {
    it('should default to today + 30 days when no dates provided', async () => {
      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      await bookingService.getBookingOverview({});

      const callArgs = (mockPool.query as jest.Mock).mock.calls[0];
      expect(callArgs[1][0]).toBe('2024-06-15');
      expect(callArgs[1][1]).toBe('2024-07-15');
    });

    it('should return empty bookings with total 0 when no bookings exist', async () => {
      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      const result = await bookingService.getBookingOverview({});

      expect(result).toEqual({ bookings: [], total: 0 });
    });
  });

  describe('custom date range', () => {
    it('should use provided startDate and endDate', async () => {
      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      await bookingService.getBookingOverview({
        startDate: '2024-06-01',
        endDate: '2024-06-30',
      });

      const callArgs = (mockPool.query as jest.Mock).mock.calls[0];
      expect(callArgs[1][0]).toBe('2024-06-01');
      expect(callArgs[1][1]).toBe('2024-06-30');
    });

    it('should throw 400 when date range exceeds 90 days', async () => {
      await expect(
        bookingService.getBookingOverview({
          startDate: '2024-01-01',
          endDate: '2024-05-01',
        })
      ).rejects.toMatchObject({
        message: 'Date range cannot exceed 90 days',
        statusCode: 400,
      });
    });

    it('should allow exactly 90 days range', async () => {
      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      await expect(
        bookingService.getBookingOverview({
          startDate: '2024-01-01',
          endDate: '2024-03-31',
        })
      ).resolves.toEqual({ bookings: [], total: 0 });
    });

    it('should throw 400 when endDate is before startDate', async () => {
      await expect(
        bookingService.getBookingOverview({
          startDate: '2024-06-30',
          endDate: '2024-06-01',
        })
      ).rejects.toMatchObject({
        message: 'End date must be after start date',
        statusCode: 400,
      });
    });

    it('should throw 400 for invalid date format', async () => {
      await expect(
        bookingService.getBookingOverview({
          startDate: '2024/06/01',
          endDate: '2024-06-30',
        })
      ).rejects.toMatchObject({
        message: 'Invalid date format. Use YYYY-MM-DD',
        statusCode: 400,
      });
    });

    it('should throw 400 for non-parseable date values', async () => {
      await expect(
        bookingService.getBookingOverview({
          startDate: '2024-13-45',
          endDate: '2024-06-30',
        })
      ).rejects.toMatchObject({
        message: 'Invalid date format. Use YYYY-MM-DD',
        statusCode: 400,
      });
    });
  });

  describe('resourceType filter', () => {
    it('should add resource_type filter when resourceType is desk', async () => {
      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      await bookingService.getBookingOverview({
        startDate: '2024-06-01',
        endDate: '2024-06-30',
        resourceType: 'desk',
      });

      const callArgs = (mockPool.query as jest.Mock).mock.calls[0];
      expect(callArgs[0]).toContain('b.resource_type = $3');
      expect(callArgs[1][2]).toBe('desk');
    });

    it('should add resource_type filter when resourceType is parking_spot', async () => {
      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      await bookingService.getBookingOverview({
        startDate: '2024-06-01',
        endDate: '2024-06-30',
        resourceType: 'parking_spot',
      });

      const callArgs = (mockPool.query as jest.Mock).mock.calls[0];
      expect(callArgs[0]).toContain('b.resource_type = $3');
      expect(callArgs[1][2]).toBe('parking_spot');
    });

    it('should not include resource_type filter when not provided', async () => {
      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      await bookingService.getBookingOverview({
        startDate: '2024-06-01',
        endDate: '2024-06-30',
      });

      const callArgs = (mockPool.query as jest.Mock).mock.calls[0];
      expect(callArgs[0]).not.toContain('b.resource_type = $3');
      expect(callArgs[1]).toHaveLength(2);
    });
  });

  describe('query structure and results', () => {
    it('should return bookings sorted by booking_date ascending with correct fields', async () => {
      const mockRows = [
        {
          id: 1,
          user_name: 'John Doe',
          resource_type: 'desk',
          resource_identifier: 'D-101',
          booking_date: '2024-06-18',
        },
        {
          id: 2,
          user_name: 'Jane Smith',
          resource_type: 'parking_spot',
          resource_identifier: 'P-A1',
          booking_date: '2024-06-20',
        },
      ];

      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: mockRows });

      const result = await bookingService.getBookingOverview({});

      expect(result.bookings).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.bookings[0]).toEqual({
        id: 1,
        user_name: 'John Doe',
        resource_type: 'desk',
        resource_identifier: 'D-101',
        booking_date: '2024-06-18',
      });
      expect(result.bookings[1]).toEqual({
        id: 2,
        user_name: 'Jane Smith',
        resource_type: 'parking_spot',
        resource_identifier: 'P-A1',
        booking_date: '2024-06-20',
      });
    });

    it('should include ORDER BY booking_date ASC and LIMIT 500 in query', async () => {
      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      await bookingService.getBookingOverview({});

      const callArgs = (mockPool.query as jest.Mock).mock.calls[0];
      expect(callArgs[0]).toContain('ORDER BY b.booking_date ASC');
      expect(callArgs[0]).toContain('LIMIT 500');
    });

    it('should join users, desks, and parking_spots tables', async () => {
      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      await bookingService.getBookingOverview({});

      const callArgs = (mockPool.query as jest.Mock).mock.calls[0];
      expect(callArgs[0]).toContain('JOIN users u ON b.user_id = u.id');
      expect(callArgs[0]).toContain('LEFT JOIN desks d ON');
      expect(callArgs[0]).toContain('LEFT JOIN parking_spots ps ON');
    });

    it('should include user_name from users table', async () => {
      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      await bookingService.getBookingOverview({});

      const callArgs = (mockPool.query as jest.Mock).mock.calls[0];
      expect(callArgs[0]).toContain('u.name AS user_name');
    });
  });
});
