import * as resourceService from './resourceService';
import pool from '../db/pool';

// Mock the database pool
jest.mock('../db/pool', () => ({
  query: jest.fn(),
}));

const mockPool = pool as jest.Mocked<typeof pool>;

describe('resourceService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('addDesk', () => {
    it('should create a new desk and return it', async () => {
      const mockDesk = {
        id: 1,
        identifier: 'D-101',
        floor: 1,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      };

      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [mockDesk] });

      const result = await resourceService.addDesk('D-101', 1);

      expect(result.desk).toEqual(mockDesk);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO desks'),
        ['D-101', 1]
      );
    });

    it('should throw 409 when identifier already exists (23505)', async () => {
      (mockPool.query as jest.Mock).mockRejectedValueOnce({ code: '23505' });

      await expect(
        resourceService.addDesk('D-101', 1)
      ).rejects.toMatchObject({
        message: 'Identifier already in use',
        statusCode: 409,
      });
    });

    it('should rethrow non-unique-violation errors', async () => {
      const dbError = new Error('Connection failed');
      (mockPool.query as jest.Mock).mockRejectedValueOnce(dbError);

      await expect(
        resourceService.addDesk('D-101', 1)
      ).rejects.toThrow('Connection failed');
    });
  });

  describe('updateDesk', () => {
    it('should update desk fields and return the updated desk', async () => {
      const mockDesk = {
        id: 1,
        identifier: 'D-102',
        floor: 2,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      };

      // First query: check desk exists
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ id: 1 }] })
        // Second query: update
        .mockResolvedValueOnce({ rows: [mockDesk] });

      const result = await resourceService.updateDesk(1, { identifier: 'D-102', floor: 2 });

      expect(result.desk).toEqual(mockDesk);
    });

    it('should throw 404 when desk does not exist', async () => {
      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      await expect(
        resourceService.updateDesk(999, { identifier: 'D-999' })
      ).rejects.toMatchObject({
        message: 'Desk not found',
        statusCode: 404,
      });
    });

    it('should throw 404 when desk is inactive', async () => {
      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      await expect(
        resourceService.updateDesk(1, { floor: 3 })
      ).rejects.toMatchObject({
        message: 'Desk not found',
        statusCode: 404,
      });
    });

    it('should throw 409 when updated identifier conflicts', async () => {
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ id: 1 }] })
        .mockRejectedValueOnce({ code: '23505' });

      await expect(
        resourceService.updateDesk(1, { identifier: 'D-EXISTING' })
      ).rejects.toMatchObject({
        message: 'Identifier already in use',
        statusCode: 409,
      });
    });

    it('should update only the identifier when only identifier is provided', async () => {
      const mockDesk = {
        id: 1,
        identifier: 'D-NEW',
        floor: 1,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      };

      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ id: 1 }] })
        .mockResolvedValueOnce({ rows: [mockDesk] });

      const result = await resourceService.updateDesk(1, { identifier: 'D-NEW' });

      expect(result.desk).toEqual(mockDesk);
      const updateCall = (mockPool.query as jest.Mock).mock.calls[1];
      expect(updateCall[0]).toContain('identifier');
      expect(updateCall[1]).toContain('D-NEW');
    });

    it('should update only the floor when only floor is provided', async () => {
      const mockDesk = {
        id: 1,
        identifier: 'D-101',
        floor: 5,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      };

      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ id: 1 }] })
        .mockResolvedValueOnce({ rows: [mockDesk] });

      const result = await resourceService.updateDesk(1, { floor: 5 });

      expect(result.desk).toEqual(mockDesk);
      const updateCall = (mockPool.query as jest.Mock).mock.calls[1];
      expect(updateCall[0]).toContain('floor');
      expect(updateCall[1]).toContain(5);
    });
  });

  describe('deactivateDesk', () => {
    it('should deactivate a desk with no active bookings', async () => {
      (mockPool.query as jest.Mock)
        // Check desk exists
        .mockResolvedValueOnce({ rows: [{ id: 1 }] })
        // Check active bookings
        .mockResolvedValueOnce({ rows: [] })
        // Deactivate
        .mockResolvedValueOnce({ rows: [] });

      await expect(
        resourceService.deactivateDesk(1)
      ).resolves.toBeUndefined();

      const updateCall = (mockPool.query as jest.Mock).mock.calls[2];
      expect(updateCall[0]).toContain('is_active = FALSE');
    });

    it('should throw 404 when desk does not exist', async () => {
      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      await expect(
        resourceService.deactivateDesk(999)
      ).rejects.toMatchObject({
        message: 'Desk not found',
        statusCode: 404,
      });
    });

    it('should throw 409 when desk has active bookings', async () => {
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ id: 1 }] })
        .mockResolvedValueOnce({ rows: [{ id: 10 }] });

      await expect(
        resourceService.deactivateDesk(1)
      ).rejects.toMatchObject({
        message: 'Resource has active bookings',
        statusCode: 409,
      });
    });

    it('should check bookings with booking_date >= CURRENT_DATE', async () => {
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ id: 1 }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      await resourceService.deactivateDesk(1);

      const bookingsCheck = (mockPool.query as jest.Mock).mock.calls[1];
      expect(bookingsCheck[0]).toContain('booking_date >= CURRENT_DATE');
      expect(bookingsCheck[0]).toContain("resource_type = 'desk'");
      expect(bookingsCheck[1]).toEqual([1]);
    });
  });

  describe('addParkingSpot', () => {
    it('should create a new parking spot and return it', async () => {
      const mockSpot = {
        id: 1,
        identifier: 'P-A1',
        location_label: 'Level A',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      };

      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [mockSpot] });

      const result = await resourceService.addParkingSpot('P-A1', 'Level A');

      expect(result.spot).toEqual(mockSpot);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO parking_spots'),
        ['P-A1', 'Level A']
      );
    });

    it('should throw 409 when identifier already exists (23505)', async () => {
      (mockPool.query as jest.Mock).mockRejectedValueOnce({ code: '23505' });

      await expect(
        resourceService.addParkingSpot('P-A1', 'Level A')
      ).rejects.toMatchObject({
        message: 'Identifier already in use',
        statusCode: 409,
      });
    });

    it('should rethrow non-unique-violation errors', async () => {
      const dbError = new Error('Connection timeout');
      (mockPool.query as jest.Mock).mockRejectedValueOnce(dbError);

      await expect(
        resourceService.addParkingSpot('P-A1', 'Level A')
      ).rejects.toThrow('Connection timeout');
    });
  });

  describe('updateParkingSpot', () => {
    it('should update parking spot fields and return the updated spot', async () => {
      const mockSpot = {
        id: 1,
        identifier: 'P-B2',
        location_label: 'Level B',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      };

      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ id: 1 }] })
        .mockResolvedValueOnce({ rows: [mockSpot] });

      const result = await resourceService.updateParkingSpot(1, {
        identifier: 'P-B2',
        locationLabel: 'Level B',
      });

      expect(result.spot).toEqual(mockSpot);
    });

    it('should throw 404 when parking spot does not exist', async () => {
      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      await expect(
        resourceService.updateParkingSpot(999, { identifier: 'P-X' })
      ).rejects.toMatchObject({
        message: 'Parking spot not found',
        statusCode: 404,
      });
    });

    it('should throw 409 when updated identifier conflicts', async () => {
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ id: 1 }] })
        .mockRejectedValueOnce({ code: '23505' });

      await expect(
        resourceService.updateParkingSpot(1, { identifier: 'P-EXISTING' })
      ).rejects.toMatchObject({
        message: 'Identifier already in use',
        statusCode: 409,
      });
    });

    it('should update only the identifier when only identifier is provided', async () => {
      const mockSpot = {
        id: 1,
        identifier: 'P-NEW',
        location_label: 'Level A',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      };

      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ id: 1 }] })
        .mockResolvedValueOnce({ rows: [mockSpot] });

      const result = await resourceService.updateParkingSpot(1, { identifier: 'P-NEW' });

      expect(result.spot).toEqual(mockSpot);
      const updateCall = (mockPool.query as jest.Mock).mock.calls[1];
      expect(updateCall[0]).toContain('identifier');
    });

    it('should update only the location_label when only locationLabel is provided', async () => {
      const mockSpot = {
        id: 1,
        identifier: 'P-A1',
        location_label: 'Level C',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      };

      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ id: 1 }] })
        .mockResolvedValueOnce({ rows: [mockSpot] });

      const result = await resourceService.updateParkingSpot(1, { locationLabel: 'Level C' });

      expect(result.spot).toEqual(mockSpot);
      const updateCall = (mockPool.query as jest.Mock).mock.calls[1];
      expect(updateCall[0]).toContain('location_label');
    });
  });

  describe('deactivateParkingSpot', () => {
    it('should deactivate a parking spot with no active bookings', async () => {
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ id: 1 }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      await expect(
        resourceService.deactivateParkingSpot(1)
      ).resolves.toBeUndefined();

      const updateCall = (mockPool.query as jest.Mock).mock.calls[2];
      expect(updateCall[0]).toContain('is_active = FALSE');
    });

    it('should throw 404 when parking spot does not exist', async () => {
      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      await expect(
        resourceService.deactivateParkingSpot(999)
      ).rejects.toMatchObject({
        message: 'Parking spot not found',
        statusCode: 404,
      });
    });

    it('should throw 409 when parking spot has active bookings', async () => {
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ id: 1 }] })
        .mockResolvedValueOnce({ rows: [{ id: 20 }] });

      await expect(
        resourceService.deactivateParkingSpot(1)
      ).rejects.toMatchObject({
        message: 'Resource has active bookings',
        statusCode: 409,
      });
    });

    it('should check bookings with booking_date >= CURRENT_DATE', async () => {
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ id: 1 }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      await resourceService.deactivateParkingSpot(1);

      const bookingsCheck = (mockPool.query as jest.Mock).mock.calls[1];
      expect(bookingsCheck[0]).toContain('booking_date >= CURRENT_DATE');
      expect(bookingsCheck[0]).toContain("resource_type = 'parking_spot'");
      expect(bookingsCheck[1]).toEqual([1]);
    });
  });
});
