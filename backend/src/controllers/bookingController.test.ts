import request from 'supertest';
import express, { Request, Response, NextFunction } from 'express';
import { attachErrorHandler } from '../app';

// Mock the booking service
jest.mock('../services/bookingService');
import * as bookingService from '../services/bookingService';

const mockedGetUserBookings = bookingService.getUserBookings as jest.MockedFunction<typeof bookingService.getUserBookings>;

/**
 * Creates a minimal test app with the booking routes,
 * using a fake auth middleware that injects a test user.
 */
function createTestApp() {
  const app = express();
  app.use(express.json());

  // Fake auth middleware — simulates authenticated user
  app.use((req: Request, _res: Response, next: NextFunction) => {
    req.user = { id: 1, email: 'test@example.com', name: 'Test User', role: 'user' };
    next();
  });

  // Mount the controller directly
  const { getMyBookings } = require('./bookingController');
  app.get('/api/v1/bookings/mine', getMyBookings);

  attachErrorHandler(app);
  return app;
}

describe('GET /api/v1/bookings/mine', () => {
  let app: express.Express;

  beforeEach(() => {
    app = createTestApp();
    jest.clearAllMocks();
  });

  it('should return bookings in the correct format when bookings exist', async () => {
    mockedGetUserBookings.mockResolvedValue([
      {
        id: 1,
        user_id: 1,
        resource_type: 'desk',
        resource_id: 101,
        booking_date: '2024-06-20',
        resource_identifier: 'D-101',
        created_at: new Date('2024-06-15'),
        updated_at: new Date('2024-06-15'),
      },
      {
        id: 2,
        user_id: 1,
        resource_type: 'parking_spot',
        resource_id: 5,
        booking_date: '2024-06-21',
        resource_identifier: 'P-A5',
        created_at: new Date('2024-06-15'),
        updated_at: new Date('2024-06-15'),
      },
    ]);

    const res = await request(app).get('/api/v1/bookings/mine');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      data: {
        bookings: [
          {
            id: 1,
            resource_type: 'desk',
            resource_identifier: 'D-101',
            booking_date: '2024-06-20',
          },
          {
            id: 2,
            resource_type: 'parking_spot',
            resource_identifier: 'P-A5',
            booking_date: '2024-06-21',
          },
        ],
      },
    });
  });

  it('should return empty array with message when no bookings exist', async () => {
    mockedGetUserBookings.mockResolvedValue([]);

    const res = await request(app).get('/api/v1/bookings/mine');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      data: {
        bookings: [],
        message: 'No upcoming bookings found',
      },
    });
  });

  it('should only include id, resource_type, resource_identifier, and booking_date in each booking', async () => {
    mockedGetUserBookings.mockResolvedValue([
      {
        id: 3,
        user_id: 1,
        resource_type: 'desk',
        resource_id: 7,
        booking_date: '2024-07-01',
        resource_identifier: 'D-202',
        created_at: new Date('2024-06-20'),
        updated_at: new Date('2024-06-20'),
      },
    ]);

    const res = await request(app).get('/api/v1/bookings/mine');

    expect(res.status).toBe(200);
    const booking = res.body.data.bookings[0];
    // Should only have these 4 keys
    expect(Object.keys(booking).sort()).toEqual(['booking_date', 'id', 'resource_identifier', 'resource_type']);
  });

  it('should call getUserBookings with the authenticated user ID', async () => {
    mockedGetUserBookings.mockResolvedValue([]);

    await request(app).get('/api/v1/bookings/mine');

    expect(mockedGetUserBookings).toHaveBeenCalledWith(1);
  });

  it('should handle service errors gracefully', async () => {
    const error = new Error('Database connection failed') as Error & { statusCode: number };
    error.statusCode = 500;
    mockedGetUserBookings.mockRejectedValue(error);

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    const res = await request(app).get('/api/v1/bookings/mine');

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'Database connection failed' });
    consoleSpy.mockRestore();
  });
});
